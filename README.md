#Outline:
- [Overview](#overview)
- [Getting Started](#getting-started)
  - [Explaining the dataset](#explaining-the-dataset)
    - [Talks Index](#talks-index)
    - [Playlist Index](#playlist-index)
    - [Speakers Index](#speakers-index)
- [How we built it](#how-we-built-it)
  - [Overview](#overview-1)
  - [Benefits of Instantsearch.js](#benefits-of-instantsearchjs)
  - [Multi-index search](#multi-index-search)
  - [Search and Clear All](#search-and-clear-all)
  - [Talk Hits and Masonry](#talk-hits-and-masonry)
    - [Highlighting](#highlighting)
  - [Speaker and Playlist Hits](#speaker-and-playlist-hits)
  - [Search for Facet Values](#search-for-facet-values)
  - [Sorting](#sorting)
  - [Current Refined Values](#current-refined-values)
  - [Custom Widgets](#custom-widgets)
    - [Updating Refinement Counts](updating-refinement-counts)
    - [Static Playlist Hits](#static-playlist-hits)

#Overview
Built using the [Algolia Search API](https://algolia.com) and [instantsearch.js](https://community.algolia.com/instantsearch.js/), this demo highlights with a "find-as-you-type" experience, in which users can easily find talks, speakers and playlist with just a few keystrokes.

* Search within multiple dataset (= indices) at the same time
* Contextual filtering
* Possibility to search for values available for each filter: using the Algolia's searchForFacetValues capability.
* Possibility to sort results against different criteria

*Disclamer: This demo using the data available via the [TED Open API](http://developer.ted.com/), before they decided to discontinue it off a few months ago*

#Getting Started
##Explaining the dataset
We pushed the different datasets (talks, speakers, playlists) into distinct indices, so we can sort each of those in a different way.
Talks are sorted by number of views, speakers by number of talkes they made, and playlist by descending date.

#How we built it
##Overview
As mentionned, we built this using Algolia’s Instantsearch.js, vanilla javascript, jQuery, Bootstrap and masonry,js. We used Bootstrap and Masonry for the styling just to keep it simple and fast to develop.

##Benefits of Instantsearch.js
Instantsearch.js is one of four frontend libraries that Algolia has available for web development. The others are Helper.js, Autocomplete.js, and React Instantsearch. All have their benefits, but for what we built here Instantsearch fit our needs. Had we built this project in React.js, the React Insantsearch would have made more sense, but Instantsearch.js gave us a lot of functionality out of the box.

Instantsearch.js comes with several widgets which make developing a search experience much easier. We used the searchBox, clearAll, hits, refinementList, sortBySelector, stats, currentRefinedValues, pagination, and a custom widget to develop this. Instantsearch is built on top of Helper.js, and you have access to a helper instance within an instantsearch instance, but the widgets mean that we got to spend more time customizing the look and feel of our experience rather having to build pagination logic.

##Multi-index search
![Multi-Index](http://i.imgur.com/CFSSc8U.gif)
We needed the ability to search across three indices simultaneously (talks, playlists, and speakers). With each keystroke in a search box we wanted to update the results on all three of these on the page.
```javascript
//Algolia specific Identifiers
  var appId = '8ERZV9OS4S';
  var apiKey = '70a756fea14109c118ff3157309ff856';
  var talkIndex = 'talks';
  var speakerIndex = 'speakers';
  var playlistIndex = 'playlists';
  var playlistStaticIndex = 'playlist_static';

  //Initialize the three instantsearch instances
  //talksInstantSearch is the primary
  var talksInstantSearch = instantsearch({
     appId: appId,
     apiKey: apiKey,
     indexName: talkIndex,
     urlSync: true,
     searchFunction: function(helper) {
      // This is the prefered method to initialize several indices
      // Create multiple instantsearch instances and bind them by overwriting
      // the searchFunction on the primary
      var query = talksInstantSearch.helper.state.query;
      speakersInstantSearch.helper.setQuery(query);
      playlistsInstantSearch.helper.setQuery(query);
      speakersInstantSearch.helper.search();
      playlistsInstantSearch.helper.search();
      helper.search();
    }
  });
  //Searches on the 'speakers' Index
  var speakersInstantSearch = instantsearch({
    appId: appId,
    apiKey: apiKey,
    indexName: speakerIndex
  });

  //Searches on the 'playlists' Index
  var playlistsInstantSearch = instantsearch({
    appId: appId,
    apiKey: apiKey,
    indexName: playlistIndex
  });

```

To do this, we needed three instantsearch instances: ‘talksInstantSearch’, ‘speakersInstantSearch’, and ‘playlistsInstantSearch’. We bound all three together using the the ‘searchFunction’ on ‘talksInstantSearch’. This is a hook that is called each time a search is done. In that function, we passed the query to the other two instances and called triggered their search.

This established the ‘talksInstantSearch’ as the primary instance which would handle updating the url and binding to the search input box. It passes the query to the other two instances keeps them all in sync.
##Search and Clear All

These widgets are implemented in a standard way. They are bound to an id and don’t have much extra configuration outside of styling.

```javascript
  talksInstantSearch.addWidget(
    instantsearch.widgets.searchBox({
      container: '#search_input',
      placeholder: 'Search for products'
    })
  );

  talksInstantSearch.addWidget(
    instantsearch.widgets.clearAll({
      container: '#exit_search',
      templates: {
        link: '<span class="search-close">.</span>'
      },
      autoHideContainer: false,
    })
  );
```

##Talk Hits and Masonry
Had we not used Masonry, this would have been a pretty standard implementation of a hits widget. Because we needed to clear existing talks and use masonry to style and organize them on the DOM, we used the transform data method to implement this rather than letting the widget handle it in the default way. Every time that there are new search results, the ‘allItems’ function is called and the new records are appended to the DOM.

```javascript
var talksTemplate = Hogan.compile(
    '{{#noResult}}' +
      '<p class="no_result">There are no talks matching your search parameters.</p>' +
    '{{/noResult}}' +
      '{{#hits}}' +
      '<div class="item talk-grid__tile__content {{ size_class }}">' +
        '<a href="#" id="hit-clicked" role="button" data={{id}}>' +
          '<img class="talk-grid__tile__thumb" src="{{ image_url }}">' +
          '<div class="talk-grid__tile__overlay"></div>' +
          '<div class="talk-grid__tile__details">' +
            '<div class="talk-grid__tile__details__speaker">{{{ _highlightResult.speakers.value }}}</div>' +
            '<h3 class="talk-grid__tile__details__title">{{{ _highlightResult.name.value }}}</h3>' +
          '</div>' +
        '</a>' +
      '</div>' +
    '{{/hits}}')
  // Init masonry
  $($talksResults).masonry();

  var emptyHits = function(){
    $($talksResults).masonry( 'remove', $($talksResults).children() );
    $($talksResults).empty();
    $($talksResults).append(talksTemplate.render( {'noResult': true} ));
  };

  talksInstantSearch.addWidget(
    instantsearch.widgets.hits({
      container: $talksResults,
      transformData: {
        allItems: function(data){
          //Each hit will need to be appropriately sized based on it's index
          //The first hit will have a "medium" size while the others surrounding it
          //will be smaller and fit around it
          hits = jQuery.data(document.body, "hits");
          if (hits == undefined){
            hits = {}
          }
          for (var i = 0; i < data.hits.length; ++i) {
            //size hits and assign classes
            hit = data.hits[i];
            hit.size_class = getSizeClass(i+1);
            hit.image_url = smallerImageURL(hit.image_url, isMediumSize(i+1));
            hit._highlightResult.speakers.value = getSpeakersForTalk(hit);
            hits[hit.id] = hit;
          }
          //Hits are re-rendered after every query. Every time all the old results
          //need to be unmounted from the DOM and replaced with the new ones
          $($talksResults).masonry('remove', $($talksResults).children() );
          $($talksResults).empty();
          $($talksResults).append(talksTemplate.render(data));
          $($talksResults).masonry('appended', $($talksResults).children() );
          $($talksResults).masonry();
          jQuery.data(document.body, "hits", hits)
          return data;
        },
      },
      templates: {
        empty: emptyHits(),
        allItems: '',
      },
      hitsPerPage: 6
    })
  );
```

###Highlighting
![Highlighting](http://i.imgur.com/sSIQzUL.gif)

We added highlighting to the show why a given record is textually relevant. This allows a user to have a better understanding of  why they are seeing the results that they are.
##Speaker and Playlist Hits
This is a pretty standard implementation of the hits widget. We pass a Hogan template for empty, and each item and let the widget handle the rest.

```javascript
 var speakersHits = instantsearch.widgets.hits({
    container: '#speakers_results',
    hitsPerPage: 4,
    templates: {
      empty: '<p class="no_result small">There are no speakers matching your search parameters.</p>',
      item: '<div class="row">' +
        '<div class="speaker_bloc">' +
          '<a href="http://www.ted.com/speakers/{{ slug }}">' +
            '<div class="col-xs-4">' +
              '<div class="image_round">' +
                '<img class="speaker_img" src="{{ image_url }}">' +
              '</div>' +
            '</div>' +
            '<div class="col-xs-8">' +
              '<p class="name">{{{ _highlightResult.name.value }}}</p>' +
              '<p class="description">{{{ _highlightResult.description.value }}}</p>' +
              '<p class="nb_talks">{{ nbTalks }} talks</p>' +
            '</div>' +
          '</a>' +
        '</div>' +
      '</div>'
    }
  });
```

##Search for Facet Values
![Search for facet](http://i.imgur.com/RIWytKZ.gif)

For the talks index, and its replicas, we defined the following as attributes for faceting:  ‘duration_range’, ‘event_name’, ‘speakers’ , ‘tags’, ‘languages’. Several of these had dozens of potential facet values and it wasn’t practical to display all of them. Limiting the display to just the most popular would have been limiting as well. To solve this, we used Insantsearch’s ability to search for facet values. This meant that we implemented an individual refinementList widget for ‘‘event_name’, ‘speakers’ , ‘tags’, ‘languages’ and used the searchForFacetValues option to add an input field for each of them. This is a separate input field from the main search input. It triggers a separate search which only retrieves facet values, not results.

As it’s a widget of the ‘talksInstantSearch’ instance, it will have the same state and retrieve facet values that are relevant to the other refinements as well. That means that if a user has already selected the “spanish” facet value, it will restrict the retrieved records to those that are in Spanish. If a user then searches on ‘tags’ input field, only tags facet values will be retrieved that are also relevant to the restricted record pool.

By default, the refinementList’s operator is ‘or’ and we didn’t adjust that for any of our facets, allowing a user to select multiple facet values for a single refinement (i.e. a user could select “spanish” and “english” facet values and see results that are in either Spanish or English).

```javascript
  talksInstantSearch.addWidget(
    // Language Dropdown
    instantsearch.widgets.refinementList({
      container: '#languages_facets',
      attributeName: 'languages',
      searchForFacetValues: {
        placeholder: "Search languages",
        templates: {
          noResults: '<li role="presentation"><a class="duration_facet_link" disabled=true>No Results</a></li>'
        }
      },
      templates:{
        item: refinementTemplate,
      },
    })
  );

```

##Sorting
![Sorting](http://i.imgur.com/cZ4pvMW.gif)

We set up several replica indices each with a different sort strategy. This guide does a good job explaining why we needed to set up multiple replicas: https://www.algolia.com/doc/guides/relevance/sorting/.  To switch between them, we used a sortBySelector widget to switch between them.
```javascript
talksInstantSearch.addWidget(
    //Responsible for changing the talks index
    //We have several replica indices that are configured based on these sort configurations
    instantsearch.widgets.sortBySelector({
      container: '#sort_options',
      cssClasses: {
        root: "form-control tight",
        item: "sort_option"
      },
      indices: [
        {name: 'talks', label: 'Newest first'},
        {name: 'talks_date_asc', label: 'Oldest first'},
        {name: 'talks_viewed_count_desc', label: 'Most viewed'},
        {name: 'talks_liked_score_desc', label: 'Most liked'},
        {name: 'talks_disliked_score_desc', label: 'Most disliked'},
        {name: 'talks_fb_shared_desc', label: 'Most shared on Faceboook'},
        {name: 'talks_fb_commented_desc', label: 'Most commented on Faceboook'},
        {name: 'talks_popularity_score_desc', label: 'Most popular'},
        {name: 'talks_unpopular_score_desc', label: 'Least popular'}
      ]
    })
  );
```

##Current Refined Values
![refined](http://i.imgur.com/BNnca69.gif)

Once a facet value is selected, we wanted a visual way to display it and to allow the end user to remove it. The currentRefinedValues widget allowed us to implement this. We use the widget to render pills under the refinement dropdowns, above the results giving the user context for what they’re seeing.

```javascript
talksInstantSearch.addWidget(
    //Display pills under dropdowns
    instantsearch.widgets.currentRefinedValues({
      container: '#active_facets',
      clearAll: 'after',
      transformData: {
        item: function(item){
          if(item.attributeName == "duration_range") {
            return getDuration(item);
          } else{
            return item;
          }
        }.bind(this)
      },
      cssClasses: {
        body: 'filters__active__stubs',
      },
      templates: {
        header: '<div class="filters__active__label">Active filters:</div>',
        item: '<span class="stub">' +
                '<span class="stub__label">{{name}}</span>' +
                '<a class="stub__remove" href="#" data-facet="duration_range" data-value="1">'+
                  '<i class="fa fa-times" aria-hidden="true"></i>' +
                '</a>' +
              '</span>',
      clearAll: '<a class="l3 filters__clear" href="#">Clear</a>',
      }
    })
  );

```
##Custom Widgets
###Updating Refinement Counts
![counts](http://i.imgur.com/BNnca69.gif)

Given the UI, and the large number of possible active refinements, we wanted to give the end user some context into how many facet values had been selected from a given refinement. If a user had selected ‘Spanish’, ‘English’ and ‘French’ facet values, we would put a number three next to “Language” to show that they had three active refinements of languages.

To build this, we used a custom widget. Custom widgets have a hook ‘render’ which is called every time that a new search is completed. We get the current refinements from the ‘results’ which is passed as a parameter into ‘render’ and append the UI using jQuery to update the counts.
```javascript
var updateRefinementCountWidget = {
    //Update number of active refinements in each refinement list
    render: function(options) {
      // Called every time there is new data
      var all_refinements = ["event_name", "speakers", "tags", "languages", "duration_range"];
      var currentRefinments = options.results.getRefinements();
      all_refinements.forEach(function(refinement){
        var count = options.results.getRefinements().filter( function(ref){ return ref.attributeName == refinement} ).length;
        // update DOM
        if(count == 0){
          document.getElementById(refinement + "_refinement").style.display = "none";
          document.getElementById(refinement + "_refinement").innerHTML = count;
        } else{
          document.getElementById(refinement + "_refinement").style.display = "inline-flex";
          document.getElementById(refinement + "_refinement").innerHTML = count;
        }
      });
    }
  };
```

##Static Playlist Hits
When you first load the page, you’ll see three talks that are styled to be similar to the default UI on TED’s homepage. Rather than these being static, we created a separate index called ‘playlist_static’ which stores these talks and used a custom widget to render them. This is a separate instantsearch instance, but not bound to a search box nor another instance. It’s just called once, when the page loads and then is not changed after.

When the page loads, the search is triggered and the results are filtered into the render hook which appends them to the DOM.
