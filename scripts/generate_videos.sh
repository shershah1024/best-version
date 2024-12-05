#!/bin/bash

echo "Fetching data and generating videos..."

# Week 1 (Current Week)
WEEK1_START=$(date -v-6d +%Y-%m-%d)
WEEK1_END=$(date +%Y-%m-%d)

# Week 2
WEEK2_START=$(date -v-13d +%Y-%m-%d)
WEEK2_END=$(date -v-7d +%Y-%m-%d)

# Week 3
WEEK3_START=$(date -v-20d +%Y-%m-%d)
WEEK3_END=$(date -v-14d +%Y-%m-%d)

# Week 4
WEEK4_START=$(date -v-27d +%Y-%m-%d)
WEEK4_END=$(date -v-21d +%Y-%m-%d)

# Function to fetch data and generate video for a week
generate_video_for_week() {
  local start_date=$1
  local end_date=$2
  local week_label=$3

  echo "Processing $week_label ($start_date to $end_date)..."

  # Fetch health data from Supabase
  HEALTH_DATA=$(curl -X GET "https://mbjkvwatoiryvmskgewn.supabase.co/rest/v1/sahha_data?select=wellbeing,activity,sleep&user_email=eq.test@example.com&date=gte.$start_date&date=lte.$end_date" \
    -H "apikey: $SUPABASE_ANON_KEY" \
    -H "Authorization: Bearer $SUPABASE_ANON_KEY")

  # Fetch food data from Supabase
  FOOD_DATA=$(curl -X GET "https://mbjkvwatoiryvmskgewn.supabase.co/rest/v1/food_track?select=dish,health_score&user_email=eq.test@example.com&created_at=gte.$start_date&created_at=lte.$end_date" \
    -H "apikey: $SUPABASE_ANON_KEY" \
    -H "Authorization: Bearer $SUPABASE_ANON_KEY")

  # Calculate averages from health data
  # Note: This requires jq to be installed
  HEALTH_AVERAGES=$(echo $HEALTH_DATA | jq -r '
    reduce .[] as $item (
      {"wellbeing": 0, "activity": 0, "sleep": 0, "count": 0};
      .wellbeing += ($item.wellbeing | tonumber) |
      .activity += ($item.activity | tonumber) |
      .sleep += ($item.sleep | tonumber) |
      .count += 1
    ) |
    {
      "wellbeing": ((.wellbeing / .count) * 100 | round),
      "activity": ((.activity / .count) * 100 | round),
      "sleep": ((.sleep / .count) * 100 | round)
    }
  ')

  # Calculate food score average
  FOOD_SCORE=$(echo $FOOD_DATA | jq -r '
    reduce .[] as $item (
      {"total": 0, "count": 0};
      .total += ($item.health_score | tonumber) |
      .count += 1
    ) |
    if .count > 0 then
      (.total / .count | round)
    else
      0
    end
  ')

  # Get recent meals (last 3)
  RECENT_MEALS=$(echo $FOOD_DATA | jq -r '[limit(3;.[])]')

  # Combine all data and generate video
  echo "Generating video for $week_label..."
  curl -X POST 'http://localhost:3000/api/video-script' \
  -H 'Content-Type: application/json' \
  -d "{
    \"wellbeing\": $(echo $HEALTH_AVERAGES | jq .wellbeing),
    \"activity\": $(echo $HEALTH_AVERAGES | jq .activity),
    \"sleep\": $(echo $HEALTH_AVERAGES | jq .sleep),
    \"food_score\": $FOOD_SCORE,
    \"user_email\": \"test@example.com\",
    \"meals\": $RECENT_MEALS
  }"

  echo "Waiting before next request..."
  sleep 5
}

# Generate videos for each week
generate_video_for_week "$WEEK1_START" "$WEEK1_END" "Current Week"
generate_video_for_week "$WEEK2_START" "$WEEK2_END" "Last Week"
generate_video_for_week "$WEEK3_START" "$WEEK3_END" "Two Weeks Ago"
generate_video_for_week "$WEEK4_START" "$WEEK4_END" "Three Weeks Ago"

echo "All video generation requests completed!" 