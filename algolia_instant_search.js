$(function () {


  /* ============================
   *  ====== INITIALIZATION ======
   *  ============================ */

  var indexName = 'talks';
  var appId = 'I3JU913ICM';
  var apiKey = '7bbc002b560942a366ca70ee403919d8';

  var search = instantsearch({
     appId: appId,
     apiKey: apiKey,
     indexName: indexName,
     urlSync: true,
     searchFunction: function(helper) {
      // This is the prefered method to initialize several indices
      // Create multiple instantsearch instances and bind them by overwriting
      // the searchFunction on the primary
      var query = search.helper.state.query;
      playlists.helper.setQuery(query);
      speakers.helper.setQuery(query);
      playlists.helper.search();
      speakers.helper.search();
      helper.search();
    }
  });

  var speakers = instantsearch({
    appId: appId,
    apiKey: apiKey,
    indexName: 'speakers'
  });

  var playlists = instantsearch({
    appId: appId,
    apiKey: apiKey,
    indexName: 'playlists'
  });

  // DOM bindings
  var $talksResults = '#talks_results';
  var $homePage = '#search_bg';
  var $inputArea = $('#input_area');
  var $searchOverlay = $('#search_overlay');

  var talksTemplate = Hogan.compile($('#talk_template').html());
  var speakersTemplate = Hogan.compile($('#speaker_template').html());
  var playlistsTemplate = Hogan.compile($('#playlists_template').html());

  // Init masonry
  $($talksResults).masonry();

  /* ===============================
   *  ======= Search Widget ========
   *  ============================== */

  search.addWidget(
    instantsearch.widgets.searchBox({
      container: '#search_input',
      placeholder: 'Search for products'
    })
  );

  search.addWidget(
    instantsearch.widgets.clearAll({
      container: '#exit_search',
      templates: {
        link: '<span class="search-close">.</span>'
      },
      autoHideContainer: false,
    })
  );

  /* ===============================
   *  == Talks HITS ================
   *  ============================== */

  var emptyHits = function(){
    $($talksResults).masonry( 'remove', $($talksResults).children() );
    $($talksResults).empty();
    $($talksResults).append(talksTemplate.render( {'noResult': true} ));
  };
  search.addWidget(
    instantsearch.widgets.hits({
      container: $talksResults,
      transformData: {
        allItems: function(data){
          for (var i = 0; i < data.hits.length; ++i) {
            hit = data.hits[i];
            hit.size_class = getSizeClass(i+1);
            hit.image_url = smallerImageURL(hit.image_url, isMediumSize(i+1));
            hit._highlightResult.speakers.value = getSpeakers(hit);
          }
          $($talksResults).masonry('remove', $($talksResults).children() );
          $($talksResults).empty();
          $($talksResults).append(talksTemplate.render(data));
          $($talksResults).masonry('appended', $($talksResults).children() );
          $($talksResults).masonry();
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

  /* ===============================
   *  == SPEAKERS & PLAYLISTS HITS =
   *  ============================== */

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
  speakers.addWidget(speakersHits);

   var playlistsHits = instantsearch.widgets.hits({
  	container: '#playlists_results',
    hitsPerPage: 4,
    templates: {
      empty: '<p class="no_result small">There are no playlists matching your search parameters.</p>',
      item: '<div class="row">' +
        '<div class="col-xs-12">'+
          '<div class=" playlist_bloc">'+
            '<a href="http://www.ted.com/playlists/{{ slug }}">'+
              '<p class="title">{{{ _highlightResult.title.value }}}</p>'+
              '<p class="description">{{{ _highlightResult.description.value }}}</p>'+
            '</a>'+
          '</div>'+
        '</div>'+
      '</div>'
    }
  });
  playlists.addWidget(playlistsHits);

  playlists.start();
  speakers.start();

  /* ===============================
   *  == HITS Formatting ===========
   *  ============================== */

  // Search Hits Formatting
  function isMediumSize(index) {
    return (index===1 || index===7 || index===11 || index===16);
  }

  function getSizeClass(index) {
    return isMediumSize(index) ? "w2" : "w1";
  }

  function smallerImageURL(image_url, isMedium) {
    if (image_url.indexOf("240x180") >= 0) { return image_url; }
    var url = image_url.split("_");
    url[url.length-1] = isMedium ? "_480x360.jpg" : "_240x180.jpg";
    return url.join('');
  }

  function getSpeakers(hit) {
    var speakersMatching = [];
    for (var j = 0; j < hit._highlightResult.speakers.length; ++j) {
      if (hit._highlightResult.speakers[j].matchLevel !== "none") { speakersMatching.push(hit._highlightResult.speakers[j].value); }
    }
    return speakersMatching.length === 0 ? hit.speakers.join(', ') : speakersMatching.join(', ');
  }

  /* ============================
   *  ===== SEARCHABLE FACETS ===
   *  ============================ */

  var refinementTemplate =
    '{{#isRefined}}'+
      '<li role="presentation">' +
         '<a class="active-facet" data-duration-range="0" role="menuitem" href="#">' +
          '<div class="refinement-name">{{name}}</div>' +
          '<i class="fa fa-times pull-right" aria-hidden="true"></i>'  +
         '</a>' +
       '</li>' +
    '{{/isRefined}}'+
    '{{^isRefined}}'+
      '<li role="presentation">' +
         '<a class="duration_facet_link" data-duration-range="0" role="menuitem" href="#">' +
           '<div class="refinement-name">{{name}}</div>' +
           '<p class="pull-right" style="font-size:10px;">{{count}}</p>' +
         '</a>' +
       '</li>' +
    '{{/isRefined}}';

  search.addWidget(
    instantsearch.widgets.refinementList({
      container: '#events_facets',
      attributeName: 'event_name',
      searchForFacetValues: {
        placeholder: "Search events",
        templates: {
          noResults: '<li role="presentation"><a class="duration_facet_link" disabled=true>No Results</a></li>'
        }
      },
      templates:{
        item: refinementTemplate
      }
    })
  );
  search.addWidget(
    instantsearch.widgets.refinementList({
      container: '#speakers_facets',
      attributeName: 'speakers',
      searchForFacetValues: {
        placeholder: "Search speakers",
        templates: {
          noResults: '<li role="presentation"><a class="duration_facet_link" disabled=true>No Results</a></li>'
        }
      },
      templates:{
        item: refinementTemplate
      }
    })
  );
  search.addWidget(
    instantsearch.widgets.refinementList({
      container: '#topics_facets',
      attributeName: 'tags',
      searchForFacetValues: {
        placeholder: "Search topics",
        templates: {
          noResults: '<li role="presentation"><a class="duration_facet_link" disabled=true>No Results</a></li>'
        }
      },
      templates:{
        item: refinementTemplate
      }
    })
  );
  search.addWidget(
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
  search.addWidget(
    instantsearch.widgets.refinementList({
      container: '#duration_facets',
      attributeName: 'duration_range',
      sortBy: ['name:asc'],
      transformData: {
        item: function(value){
          switch(value.name){
            case "0":
              value.name = "0-6 minutes"
              break;
            case "1":
              value.name = "6-12 minutes"
              break;
            case "2":
              value.name = "12-18 minutes"
              break;
            case "3":
              value.name = "18-24 minutes"
              break;
            default:
              value.name = "24+ minutes"
          }
          return value;
        }
      },
      templates:{
        item: refinementTemplate
      }
    })
  );

  /* ============================
   *  ===== SORT BY =============
   *  ============================ */

  search.addWidget(
    instantsearch.widgets.sortBySelector({
      container: '#sort_options',
      cssClasses: {
        root: "form-control tight",
        item: "sort_option"
      },
      indices: [
        {name: 'talks', label: 'Most Viewed'},
        {name: 'talks_popularity_score_desc', label: 'Most Popular'},
        {name: 'talks_viewed_count_desc', label: 'Newest first'},
        {name: 'talks_date_asc', label: 'Oldest first'},
        {name: 'talks_beautiful_rating_desc', label: 'Most Beautiful'},
        {name: 'talks_courageous_rating_desc', label: 'Most Courageous'},
        {name: 'talks_funny_rating_desc', label: 'Most Funny'},
        {name: 'talks_informative_rating_desc', label: 'Most Informative'},
        {name: 'talks_ingenious_rating_desc', label: 'Most Ingenious'},
        {name: 'talks_inspiring_rating_desc', label: 'Most Inspiring'},
        {name: 'talks_fascinating_rating_desc', label: 'Most Fascinating'},
        {name: 'talks_jaw_droping_rating_desc', label: 'Most Jaw'},
        {name: 'talks_persuasive_rating_desc', label: 'Most Persuasive'},
      ]
    })
  );

  /* ============================
   *  ===== STATS ===============
   *  =========================== */

  search.addWidget(
    instantsearch.widgets.stats({
      container: '#found_in',
      templates: {
        body: '<h2 class="talk_stats">Talks ({{nbHits}})</h2> <span class="found_in">Found in {{processingTimeMS}}ms</span>'
      },
    })
  );

  /* ============================
   *  ===== Custom Widget =======
   *  ============================ */

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

  search.addWidget(updateRefinementCountWidget);

  /*  ============================
   *  === Current Refinements ====
   *  ============================ */
  search.addWidget(
    instantsearch.widgets.currentRefinedValues({
      container: '#active_facets',
      clearAll: 'after',
      transformData: {
        item: function(item){
          if(item.attributeName =="duration_range"){
            switch(item.name){
              case "0":
                item.name = "0-6 minutes"
                break;
              case "1":
                item.name = "6-12 minutes"
                break;
              case "2":
                item.name = "12-18 minutes"
                break;
              case "3":
                item.name = "18-24 minutes"
                break;
              default:
                item.name = "24+ minutes"
            }
          }
          return item;
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


  /*  ============================
   *  === Pagination =============
   *  ============================ */

  search.addWidget(
    instantsearch.widgets.pagination({
      container: '#search_pagination',
      maxPages: 20,
      labels:{
        previous: "Previous",
        next: "Next"
      },
      showFirstLast: true,
      cssClasses: {
        root: "pagination",
        previous: "pagination__prev pagination__flipper pagination__link",
        next: "pagination__next pagination__flipper pagination__link",
        item: "pagination__separator",
        active: "pagination__item pagination__link pagination__current",
        disabled:"pagination__flipper--disabled",
      },
      scrollTo: false
    })
  );

  /* ============================
   *  ====== SEARCH OVERLAY ======
   *  ============================ */
  var pageState = 0;

  $inputArea.on("click", function(e) {
    e.preventDefault();
    if (pageState !== 0) { return true; }
    $searchOverlay.removeClass("hidden");
    $searchOverlay.fadeTo(100, 1, function() {
      $('#search_input').focus();
      togglePageState();
    });
    search.start();
  });

  $('#exit_search').on("click", function(e){
    e.preventDefault();
    if (pageState !== 1) { return true; }
    $('#search_input').val("");
    search.start();
    $searchOverlay.addClass("hidden");
    $searchOverlay.fadeTo(100, 0, function() {
      togglePageState();
      search.start();
    });
  });

  function togglePageState() {
    pageState = (pageState === 0) ? 1 : 0;
  }


});
