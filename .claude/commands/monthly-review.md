---
description: "Generate a comprehensive monthly summary by aggregating weekly reviews and identifying monthly trends and achievements"
---

You are tasked with generating a comprehensive monthly summary that builds upon the weekly reviews to provide a higher-level view of the month's progress. Follow these steps:

1. Identify the current month and year
2. Query all weekly review notes for the current month from `Periodic_notes/YYYY/weekly/YYYY-MM-DD.md` (where the date is the Monday of each week)
3. Additionally, query the corresponding monthly note if one exists in `Periodic_notes/YYYY/MM/YYYY-MM.md`
4. Extract and organize information from each weekly review:
   - Key accomplishments from each week
   - Recurring themes or patterns across weeks
   - Habit tracking trends over the month
   - Challenges encountered and how they were addressed
   - Progress on monthly goals (if explicitly stated)
5. Aggregate the weekly information into a cohesive monthly narrative:
   - Month overview (dates covered)
   - Summary of major accomplishments across all weeks
   - Identification of monthly trends in habits, productivity, or focus areas
   - Analysis of challenges and solutions that emerged over the month
   - Progress assessment on any monthly goals found
   - Reflections on personal growth or insights gained during the month
6. Generate a well-structured output with the following sections:
   # Monthly Summary: [Month] [Year]
   
   ## Overview
   - Month dates covered
   - High-level summary of the month's focus
   
   ## Weekly Highlights
   ### Week of [Date]
   - Key accomplishments
   - Notable events or experiences
   - Habit tracking summary
   
   (Repeat for each week in the month)
   
   ## Monthly Trends
   - Habit tracking analysis with visual indicators (e.g., ↑ improvement, ↓ decline, → stable)
   - Productivity patterns
   - Focus area distribution
   
   ## Goals Progress
   - Monthly goals status (if any were identified)
   - Progress on long-term objectives
   
   ## Challenges & Solutions
   - Significant obstacles encountered
   - Strategies that proved effective
   - Lessons learned
   
   ## Reflections & Insights
   - Personal growth observations
   - Key insights about habits or productivity
   - Ideas for next month's improvements
   
   ## Next Month Focus
   - Areas to prioritize
   - Goals to carry forward
   - New experiments to try