var algolia = require('algoliasearch');
var credentials = {
  applicationId: "I3JU913ICM",
  apiKey: "3f229aa314b125887b5805b7b1642da5"
};

var client = algolia(credentials.applicationId, credentials.apiKey);

var config = {
  attributesForFaceting: [
    'date',
    'duration_range',
    'searchable(tags)',
    'searchable(speakers)',
    'searchable(event_name)',
    'searchable(languages)'
  ],
};

var indexNames = ['talks', 'talks_date_asc', 'talks_viewed_count_desc', 'talks_popularity_score_desc', 'talks_beautiful_rating_desc', 'talks_courageous_rating_desc', 'talks_funny_rating_desc', 'talks_informative_rating_desc', 'talks_ingenious_rating_desc', 'talks_inspiring_rating_desc', 'talks_fascinating_rating_desc', 'talks_jaw_droping_rating_desc', 'talks_persuasive_rating_desc']

indexNames.forEach(function(indexName) {
  var idx = client.initIndex(indexName);
  idx.getSettings().then(function(content) {
    Object.assign(content, config);
    idx.setSettings(content);
  });
});
