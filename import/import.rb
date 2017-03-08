#! /usr/bin/env ruby

require 'rubygems'
require 'json'
require 'algoliasearch'
require 'ted_api'
require 'time'
require 'yaml'


####
#### HELPER METHODS
####
def toDateTimestamp(value)
	Time.parse(value.to_s).to_i
end
def toDuration(value)
	a = value.split(":");
	return a[1].to_i*60 + a[2].to_i
end
def toDurationRange(value)
	value = value['media']
	return toDurationRangeString(0) if value.nil?
	value = value['duration']
	return toDurationRangeString(0) if value.nil?
	value = toDuration(value)
	range = (value / (60*6)).to_i
	return toDurationRangeString([4, range].min)
end
def toDurationRangeString(value)
	case value
	when 0
		return "0-6 minutes"
	when 1
		return "6-12 minutes"
	when 2
		return "12-18 minutes"
	when 3
		return "18-24 minutes"
	else
		return "24+ minutes"
	end
end
def getTalkName(talk_name)
	talk_name_array = talk_name.split(": ");
	talk_name_array.delete_at(0) if talk_name_array.length > 1
	return talk_name_array.join('')
end
def getPopularityScore(date, views)
	days = (Time.now.to_i - date) / (24 * 60 * 60)
	(views/days).to_i
end
def toSpeakers(speakers)
	r = []
	speakers.each do |s|
		r << "#{s.speaker.firstname} #{s.speaker.lastname}" if s.speaker.middlename.nil?
		r << "#{s.speaker.firstname} #{s.speaker.middlename} #{s.speaker.lastname}" if !s.speaker.middlename.nil?
	end
	r
end
def addSpeakers(speakers, image_url, nbViews)
	r = []
	speakers.each do |s|
		r << ({ image_url: image_url, name: s.speaker.name, id: s.speaker.id, score: nbViews })
	end
	r
end
def mergeDuplicatedSpeakers(speakers)
	unique_speakers = {}
	speakers.each do |s|
		if unique_speakers.key?(s[:name])
			unique_speakers[s[:name]][:score] += s[:score]
			unique_speakers[s[:name]][:nbTalks] += 1
		else
			unique_speakers[s[:name]] = { name: s[:name], score: s[:score], image_url: s[:image_url], slug: s[:slug], description: s[:description], nbTalks: 1 }
		end
	end
	result = []
	unique_speakers.each do |speaker_name, speaker_object|
		result << speaker_object
	end
	return result
end



###
### ALGOLIA INIT & CONFIGURATION
####
Algolia.init :application_id => "I3JU913ICM", :api_key => "3f229aa314b125887b5805b7b1642da5"
talks_index = Algolia::Index.new("talks")
talks_index.set_settings({
	attributesToIndex: ['unordered(name)', 'speakers'],
	customRanking: ['desc(date)'],
	minWordSizefor1Typo: 3,
	minWordSizefor2Typos: 7,
	attributesForFaceting: ['date', 'duration_range', 'event_name', 'speakers', 'tags', 'languages'],
	slaves: ['talks_date_asc', 'talks_viewed_count_desc', 'talks_popularity_score_desc', 'talks_beautiful_rating_desc', 'talks_courageous_rating_desc', 'talks_funny_rating_desc', 'talks_informative_rating_desc', 'talks_ingenious_rating_desc', 'talks_inspiring_rating_desc', 'talks_fascinating_rating_desc', 'talks_jaw_droping_rating_desc', 'talks_persuasive_rating_desc']
	})
Algolia::Index.new("talks_date_asc"               ).set_settings({ attributesToIndex: ['unordered(name)', 'speakers'], minWordSizefor1Typo: 3, minWordSizefor2Typos: 7,  attributesForFaceting: ['date', 'duration_range', 'event_name', 'speakers', 'tags', 'languages'], customRanking: ['asc(date)'] })
Algolia::Index.new("talks_viewed_count_desc"      ).set_settings({ attributesToIndex: ['unordered(name)', 'speakers'], minWordSizefor1Typo: 3, minWordSizefor2Typos: 7,  attributesForFaceting: ['date', 'duration_range', 'event_name', 'speakers', 'tags', 'languages'], customRanking: ['desc(viewed_count)'] })
Algolia::Index.new("talks_popularity_score_desc"  ).set_settings({ attributesToIndex: ['unordered(name)', 'speakers'], minWordSizefor1Typo: 3, minWordSizefor2Typos: 7,  attributesForFaceting: ['date', 'duration_range', 'event_name', 'speakers', 'tags', 'languages'], customRanking: ['desc(popularity_score)'] })
Algolia::Index.new("talks_beautiful_rating_desc"  ).set_settings({ attributesToIndex: ['unordered(name)', 'speakers'], minWordSizefor1Typo: 3, minWordSizefor2Typos: 7,  attributesForFaceting: ['date', 'duration_range', 'event_name', 'speakers', 'tags', 'languages'], customRanking: ['desc(beautiful_rating)'] })
Algolia::Index.new("talks_courageous_rating_desc" ).set_settings({ attributesToIndex: ['unordered(name)', 'speakers'], minWordSizefor1Typo: 3, minWordSizefor2Typos: 7,  attributesForFaceting: ['date', 'duration_range', 'event_name', 'speakers', 'tags', 'languages'], customRanking: ['desc(courageous_rating)'] })
Algolia::Index.new("talks_funny_rating_desc"      ).set_settings({ attributesToIndex: ['unordered(name)', 'speakers'], minWordSizefor1Typo: 3, minWordSizefor2Typos: 7,  attributesForFaceting: ['date', 'duration_range', 'event_name', 'speakers', 'tags', 'languages'], customRanking: ['desc(funny_rating)'] })
Algolia::Index.new("talks_informative_rating_desc").set_settings({ attributesToIndex: ['unordered(name)', 'speakers'], minWordSizefor1Typo: 3, minWordSizefor2Typos: 7,  attributesForFaceting: ['date', 'duration_range', 'event_name', 'speakers', 'tags', 'languages'], customRanking: ['desc(informative_rating)'] })
Algolia::Index.new("talks_ingenious_rating_desc"  ).set_settings({ attributesToIndex: ['unordered(name)', 'speakers'], minWordSizefor1Typo: 3, minWordSizefor2Typos: 7,  attributesForFaceting: ['date', 'duration_range', 'event_name', 'speakers', 'tags', 'languages'], customRanking: ['desc(ingenious_rating)'] })
Algolia::Index.new("talks_inspiring_rating_desc"  ).set_settings({ attributesToIndex: ['unordered(name)', 'speakers'], minWordSizefor1Typo: 3, minWordSizefor2Typos: 7,  attributesForFaceting: ['date', 'duration_range', 'event_name', 'speakers', 'tags', 'languages'], customRanking: ['desc(inspiring_rating)'] })
Algolia::Index.new("talks_fascinating_rating_desc").set_settings({ attributesToIndex: ['unordered(name)', 'speakers'], minWordSizefor1Typo: 3, minWordSizefor2Typos: 7,  attributesForFaceting: ['date', 'duration_range', 'event_name', 'speakers', 'tags', 'languages'], customRanking: ['desc(fascinating_rating)'] })
Algolia::Index.new("talks_jaw_droping_rating_desc").set_settings({ attributesToIndex: ['unordered(name)', 'speakers'], minWordSizefor1Typo: 3, minWordSizefor2Typos: 7,  attributesForFaceting: ['date', 'duration_range', 'event_name', 'speakers', 'tags', 'languages'], customRanking: ['desc(jaw_droping_rating)'] })
Algolia::Index.new("talks_persuasive_rating_desc" ).set_settings({ attributesToIndex: ['unordered(name)', 'speakers'], minWordSizefor1Typo: 3, minWordSizefor2Typos: 7,  attributesForFaceting: ['date', 'duration_range', 'event_name', 'speakers', 'tags', 'languages'], customRanking: ['desc(persuasive_rating)'] })

tags_index     = Algolia::Index.new("tags")
tags_index.set_settings({     attributesToIndex: ['name'], customRanking: ['desc(score)'], attributesToRetrieve: ['name'] })
events_index   = Algolia::Index.new("events")
events_index.set_settings({   attributesToIndex: ['name'], customRanking: ['desc(score)'], attributesToRetrieve: ['name'] })
speakers_index = Algolia::Index.new("speakers")
speakers_index.set_settings({ attributesToIndex: ['name', 'description'], customRanking: ['desc(score)'], attributesToRetrieve: ['name', 'image_url', 'description', 'slug', 'nbTalks'] })
playlists_index = Algolia::Index.new("playlists")
playlists_index.set_settings({ attributesToIndex: ['title', 'description'], attributesToRetrieve: ['title', 'description', 'slug'] })



####
#### TED API INIT
####
@client = TedApi::Client.new(api_key: 'b4a36w73x62cekv299tmbdxs')
talks_collection = {}
talks_array = []
tags_collection = {}
tags_array = []
tags_count = Hash.new 0
events_array = []
events_count = Hash.new 0
speakers_collection = {}
speakers_array = []
speakers_count = Hash.new 0
playlists_array = []



####
#### LOAD DATA FROM TED API
####
puts "============="
puts "Loading Talks"
offset = 0
limit = 100
loop do
	response_talks = @client.talks(nil, { limit: limit, offset: offset, fields: "images, viewed_count, emailed_count, commented_count, name, description, events, media, next_talks_ids, media_profile_uris, photo_urls, rating_word_ids, speaker_ids, speakers, theme_ids, tags" })
	break if response_talks.nil? || response_talks.talks.nil? || response_talks.empty?
	puts "* Adding #{response_talks.talks.size} talks"
	objects = response_talks.talks.map.with_index do |talk, index|
		talk = talk.talk.to_hash
		{
			:objectID => talk['id'],
			:name => getTalkName(talk['name']),
			:description => talk['description'],
			:speakers => toSpeakers(talk['speakers']),
			:slug => talk['slug'],
			:date => toDateTimestamp(talk['recorded_at']),
			:duration_range => toDurationRange(talk),
			:tags => talk['tags'].values.to_a,
			:viewed_count => talk['viewed_count'],
			:popularity_score => getPopularityScore(toDateTimestamp(talk['recorded_at']), talk['viewed_count'])
		}
	end
	talks_array += objects
	offset += limit
	sleep 0.01
end
puts "= #{talks_array.size} talks added"

puts "============="
puts "Improving Talks"
nb_talks_improved = 0
talks_array.each do |t|
	talk = @client.talks(t[:objectID]).talk
	t.merge!( {image_url: talk.images.last.image.url} )
	t.merge!( {event_name: talk.event.name} )
	talk.ratings.each do |r|
		case r.rating.id
		when 1
			t.merge!( {beautiful_rating: r.rating['count']} )
		when 3
			t.merge!( {courageous_rating: r.rating['count']} )
		when 7
			t.merge!( {funny_rating: r.rating['count']} )
		when 8
			t.merge!( {informative_rating: r.rating['count']} )
		when 9
			t.merge!( {ingenious_rating: r.rating['count']} )
		when 10
			t.merge!( {inspiring_rating: r.rating['count']} )
		when 22
			t.merge!( {fascinating_rating: r.rating['count']} )
		when 23
			t.merge!( {jaw_droping_rating: r.rating['count']} )
		when 23
			t.merge!( {persuasive_rating: r.rating['count']} )
		end
	end

	languages = []
	if !talk.languages.nil?
		talk.languages.each do |language_code, language_name|
			languages << language_name['name']
		end
	end
	t.merge!( {languages: languages} )

	talk.tags.each do |tag|
		tags_count[tag.tag] += 1
	end
	events_count[talk.event.name] += talk.viewed_count

	speakers_array += addSpeakers(talk['speakers'], talk.images.last.image.url, talk.viewed_count)
	nb_talks_improved += 1
	puts "talk improved : #{nb_talks_improved}"
	sleep 0.01
end
puts "= All talks improved"


puts "============="
puts "Improving Speakers"
nb_speakers_improved = 0
speakers_array.each do |t|
	speaker = @client.speakers(t[:id]).speaker
	t.merge!( {slug: speaker[:slug]} )
	t.merge!( {description: speaker[:description]} )
	sleep 0.01
	nb_speakers_improved += 1
	puts "speakers improved : #{nb_speakers_improved}"
end
puts "= All speakers improved"


puts "============="
puts "Loading playlists"
file_playlists = File.open("playlists.json").read
playlists = JSON.parse(file_playlists)
playlists.each do |p|
	playlists_array << {
		:objectID => p['id'],
		:title => p['title'],
		:slug => p['slug'],
		:description => p['description'].to_s
	}
end
puts "= #{playlists_array.size} playlists added"
puts "= All playlists loaded"


puts "============="
puts "Tags"
tags_count.each {|key, value| tags_array << { name: key, score: value} }
puts "= #{tags_count.size} Tags loaded"

puts "============="
puts "Events"
events_count.each {|key, value| events_array << { name: key, score: (value/1000).to_i} }
puts "= #{events_count.size} Events loaded"

puts "============="
puts "Speakers"
speakers_array = mergeDuplicatedSpeakers(speakers_array)
puts "= #{speakers_array.size} Speakers loaded"



####
#### INDEXING
####
puts "============="
puts "Indexing"
talks_index.clear
tags_index.clear
events_index.clear
speakers_index.clear
playlists_index.clear
talks_index.add_objects(talks_array)
tags_index.add_objects(tags_array)
events_index.add_objects(events_array)
speakers_index.add_objects(speakers_array)
playlists_index.add_objects(playlists_array)
puts "Indexing done!!"
