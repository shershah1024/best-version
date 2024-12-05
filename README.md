# Best Future Friend - Video Generation Process

The video generation process involves four key steps:

## 1. Health Data Collection
- **Sahha Data**: Daily metrics for wellbeing, activity, and sleep (0-1 scale)
- **Food Data**: Weekly food tracking with health scores (0-100 scale)
- **Processing**: Converts raw data into weekly averages for personalized feedback

## 2. Future Self Version Selection
Based on average Sahha scores (wellbeing, activity, sleep):
- **Best Version** (Above 80%): 1716f79923fe417e80dfd3cb07be01fb
- **Medium Version** (70-80%): 7e6fda74ad8740babb472763a3aaa5a2
- **Needs Improvement** (Below 70%): 3f1f324fa7314983bb9244c55b997189

## 3. Script Generation (Groq AI)
Creates personalized scripts incorporating:
- Weekly health metrics and trends
- Recent meal choices and their health scores
- Tailored feedback based on score ranges
- Specific suggestions for improvement
- 30-45 second speaking duration

## 4. Video Generation (HeyGen)
- Generates video using selected future self version
- Converts script to natural speech
- Stores video in Supabase storage
- Links video to specific week and user
