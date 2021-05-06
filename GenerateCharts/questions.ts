import { EmojiConvertor } from "emoji-js"

// Slack convertes emojis to shortcode. We need to convert back to unicode
const emoji = new EmojiConvertor.EmojiConvertor()
emoji.replace_mode = "unified"

export const questions = [
  {
    title: ":thinking_face: How was your workday?",
    id: "workday_quality",
    placeholder: "My workday was…",
    options: [
      ":sob: Terrible",
      ":slightly_frowning_face: Bad",
      ":neutral_face: OK",
      ":slightly_smiling_face: Good",
      ":heart_eyes: Awesome!",
    ],
  },
  {
    id: "worked_with_other_people",
    title: ":busts_in_silhouette: I worked with other people…",
    placeholder: "How much?",
    options: [
      "None of the day",
      "A little of the day",
      "Some of the day",
      "Much of the day",
      "Most or all of the day",
    ],
  },
  {
    id: "helped_other_people",
    title: ":raised_hands: I helped other people…",
    placeholder: "How much?",
    options: [
      "None of the day",
      "A little of the day",
      "Some of the day",
      "Much of the day",
      "Most or all of the day",
    ],
  },
  {
    id: "interrupted",
    title: ":rotating_light: My work was interrupted…",
    placeholder: "How much?",
    options: [
      "None of the day",
      "A little of the day",
      "Some of the day",
      "Much of the day",
      "Most or all of the day",
    ],
  },
  {
    id: "goals",
    title: ":dart: I made progress towards my goals…",
    placeholder: "How much?",
    options: [
      "None of the day",
      "A little of the day",
      "Some of the day",
      "Much of the day",
      "Most or all of the day",
    ],
  },
  {
    id: "high_quality_work",
    title: ":sparkles: I did high-quality work…",
    placeholder: "How much?",
    options: [
      "None of the day",
      "A little of the day",
      "Some of the day",
      "Much of the day",
      "Most or all of the day",
    ],
  },
  {
    id: "lot_of_work",
    title: ":rocket: I did a lot of work…",
    placeholder: "How much?",
    options: [
      "None of the day",
      "A little of the day",
      "Some of the day",
      "Much of the day",
      "Most or all of the day",
    ],
  },
  {
    id: "breaks",
    title: ":coffee: I took breaks today…",
    placeholder: "How often?",
    options: [
      "None of the day",
      "A little of the day",
      "Some of the day",
      "Much of the day",
      "Most or all of the day",
    ],
  },
  {
    id: "meetings",
    title:
      ":speaking_head_in_silhouette: How many meetings did you have today?",
    placeholder: "How many?",
    options: ["None", "1", "2", "3–4", "5 or more"],
  },
  {
    id: "emotions",
    title: ":thought_balloon: How do you feel about your workday?",
    placeholder: "I feel…",
    options: [
      ":grimacing: Tense or nervous",
      ":worried: Stressed or upset",
      ":cry: Sad or depressed",
      ":yawning_face: Bored",
      ":relaxed: Calm or relaxed",
      ":relieved: Serene or content",
      ":slightly_smiling_face: Happy or elated",
      ":grinning: Excited or alert",
    ],
  },
  {
    id: "most_productive",
    title: ":chart_with_upwards_trend: Today, I felt *most* productive:",
    placeholder: "When?",
    options: [
      ":sunrise: In the morning (9:00–11:00)",
      ":clock12: Mid-day (11:00-13:00)",
      ":clock2: Early afternoon (13:00-15:00)",
      ":clock5: Late afternoon (15:00-17:00)",
      ":night_with_stars: Outside of typical work hours",
      ":date: Equally throughout the day",
    ],
  },
  {
    id: "least_productive",
    title: ":chart_with_downwards_trend: Today, I felt *least* productive:",
    placeholder: "When?",
    options: [
      ":sunrise: In the morning (9:00–11:00)",
      ":clock12: Mid-day (11:00-13:00)",
      ":clock2: Early afternoon (13:00-15:00)",
      ":clock5: Late afternoon (15:00-17:00)",
      ":night_with_stars: Outside of typical work hours",
      ":date: Equally throughout the day",
    ],
  },
].map((d) => ({
  ...d,
  titleWithEmoji: emoji.replace_colons(d.title),
  optionsWithEmoji: d.options.map((option) => emoji.replace_colons(option)),
}))
