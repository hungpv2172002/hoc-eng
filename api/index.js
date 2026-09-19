// server.ts
import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import nodemailer from "nodemailer";
import { GoogleGenAI, Type } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

// src/data/initialQuestions.ts
var INITIAL_QUESTIONS = [
  {
    id: 1,
    vi: "C\xF3 l\u1EBD ch\xFAng ta c\u1EA7n th\xEAm th\u1EDDi gian \u0111\u1EC3 ho\xE0n th\xE0nh d\u1EF1 \xE1n n\xE0y.",
    hints: "perhaps = c\xF3 l\u1EBD; need more time = c\u1EA7n th\xEAm th\u1EDDi gian; project = d\u1EF1 \xE1n",
    answers: [
      "Perhaps we need more time to finish this project.",
      "Perhaps we need more time to complete this project.",
      "Maybe we need more time to complete this project.",
      "Maybe we need more time to finish this project."
    ],
    created_date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0]
  },
  {
    id: 2,
    vi: "B\u1EA1n c\xF3 th\u1EC3 n\xF3i ch\u1EADm l\u1EA1i m\u1ED9t ch\xFAt \u0111\u01B0\u1EE3c kh\xF4ng?",
    hints: "speak slowly = n\xF3i ch\u1EADm l\u1EA1i; a little bit = m\u1ED9t ch\xFAt; could you = b\u1EA1n c\xF3 th\u1EC3",
    answers: [
      "Could you speak a little more slowly?",
      "Could you speak more slowly, please?",
      "Can you speak a little slower?",
      "Can you speak more slowly?"
    ],
    created_date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0]
  },
  {
    id: 3,
    vi: "H\xF4m nay th\u1EDDi ti\u1EBFt \u0111\u1EB9p qu\xE1, ch\xFAng ta \u0111i d\u1EA1o nh\xE9!",
    hints: "nice weather = th\u1EDDi ti\u1EBFt \u0111\u1EB9p; go for a walk = \u0111i d\u1EA1o; shall we = ch\xFAng ta ... nh\xE9",
    answers: [
      "The weather is so nice today, let's go for a walk!",
      "It's such nice weather today, let's go for a walk!",
      "The weather is very nice today, shall we go for a walk?"
    ],
    created_date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0]
  },
  {
    id: 4,
    vi: "T\xF4i r\u1EA5t xin l\u1ED7i v\xEC \u0111\xE3 \u0111\u1EC3 b\u1EA1n ph\u1EA3i ch\u1EDD l\xE2u.",
    hints: "sorry for = xin l\u1ED7i v\xEC; keep someone waiting = \u0111\u1EC3 ai \u0111\xF3 ch\u1EDD \u0111\u1EE3i; so long = l\xE2u",
    answers: [
      "I am so sorry for keeping you waiting so long.",
      "I'm so sorry for keeping you waiting so long.",
      "I am sorry to keep you waiting so long.",
      "I'm sorry to keep you waiting for so long."
    ],
    created_date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0]
  },
  {
    id: 5,
    vi: "\u0110\u1EEBng ng\u1EA7n ng\u1EA1i li\xEAn h\u1EC7 v\u1EDBi t\xF4i n\u1EBFu b\u1EA1n c\u1EA7n th\xEAm b\u1EA5t k\u1EF3 s\u1EF1 tr\u1EE3 gi\xFAp n\xE0o.",
    hints: "hesitate = ng\u1EA7n ng\u1EA1i; contact = li\xEAn h\u1EC7; further assistance = h\u1ED7 tr\u1EE3 th\xEAm",
    answers: [
      "Don't hesitate to contact me if you need any further help.",
      "Do not hesitate to contact me if you need further assistance.",
      "Feel free to contact me if you need any help."
    ],
    created_date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0]
  },
  {
    id: 6,
    vi: "C\u1EA3m \u01A1n b\u1EA1n r\u1EA5t nhi\u1EC1u v\xEC \u0111\xE3 d\xE0nh th\u1EDDi gian qu\xFD b\xE1u cho t\xF4i.",
    hints: "valuable time = th\u1EDDi gian qu\xFD b\xE1u; thank you for = c\u1EA3m \u01A1n v\xEC; sparing time = d\xE0nh th\u1EDDi gian",
    answers: [
      "Thank you very much for giving me your valuable time.",
      "Thank you so much for your valuable time.",
      "Thanks a lot for spending your valuable time with me."
    ],
    created_date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0]
  },
  {
    id: 7,
    vi: "T\xF4i \u0111\u1ED3ng \xFD ho\xE0n to\xE0n v\u1EDBi quan \u0111i\u1EC3m c\u1EE7a b\u1EA1n v\u1EC1 v\u1EA5n \u0111\u1EC1 n\xE0y.",
    hints: "totally agree = ho\xE0n to\xE0n \u0111\u1ED3ng \xFD; point of view = quan \u0111i\u1EC3m; regarding = v\u1EC1 v\u1EA5n \u0111\u1EC1",
    answers: [
      "I completely agree with your point of view on this matter.",
      "I totally agree with your opinion on this issue.",
      "I couldn't agree more with your point of view on this matter."
    ],
    created_date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0]
  },
  {
    id: 8,
    vi: "B\u1EA1n \u0111\xE3 t\u1EEBng \u0111\u1EBFn th\u0103m th\xE0nh ph\u1ED1 \u0110\xE0 N\u1EB5ng bao gi\u1EDD ch\u01B0a?",
    hints: "have you ever been to = b\u1EA1n \u0111\xE3 t\u1EEBng \u0111\u1EBFn; visit = th\u0103m",
    answers: [
      "Have you ever visited Da Nang city before?",
      "Have you ever been to Da Nang city?",
      "Have you ever visited Da Nang?"
    ],
    created_date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0]
  },
  {
    id: 9,
    vi: "L\xE0m \u01A1n cho t\xF4i m\u1ED9t t\xE1ch c\xE0 ph\xEA s\u1EEFa \u0111\xE1 \xEDt \u0111\u01B0\u1EDDng.",
    hints: "iced milk coffee = c\xE0 ph\xEA s\u1EEFa \u0111\xE1; less sugar = \xEDt \u0111\u01B0\u1EDDng; please = l\xE0m \u01A1n",
    answers: [
      "Please give me a cup of iced milk coffee with less sugar.",
      "Can I have an iced milk coffee with less sugar, please?",
      "I would like an iced milk coffee with less sugar, please."
    ],
    created_date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0]
  },
  {
    id: 10,
    vi: "Ch\xFAng t\xF4i d\u1EF1 \u0111\u1ECBnh s\u1EBD ra m\u1EAFt s\u1EA3n ph\u1EA9m m\u1EDBi v\xE0o cu\u1ED1i th\xE1ng n\xE0y.",
    hints: "plan to = d\u1EF1 \u0111\u1ECBnh; launch = ra m\u1EAFt; new product = s\u1EA3n ph\u1EA9m m\u1EDBi; by the end of = v\xE0o cu\u1ED1i",
    answers: [
      "We plan to launch the new product by the end of this month.",
      "We are planning to release our new product at the end of this month.",
      "We plan to release the new product by the end of this month."
    ],
    created_date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0]
  },
  {
    id: 11,
    vi: "Th\xE0nh th\u1EADt m\xE0 n\xF3i, t\xF4i kh\xF4ng ngh\u0129 \u0111\xE2y l\xE0 m\u1ED9t \xFD t\u01B0\u1EDFng hay.",
    hints: "to be honest = th\xE0nh th\u1EADt m\xE0 n\xF3i; frankly = th\u1EB3ng th\u1EAFn; good idea = \xFD t\u01B0\u1EDFng hay",
    answers: [
      "To be honest, I don't think this is a good idea.",
      "Frankly speaking, I don't think this is a good idea.",
      "Honestly, I don't think that is a good idea."
    ],
    created_date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0]
  },
  {
    id: 12,
    vi: "Cu\u1ED9c h\u1ECDp h\xF4m nay s\u1EBD b\u1ECB ho\xE3n l\u1EA1i cho \u0111\u1EBFn th\u1EE9 S\xE1u tu\u1EA7n t\u1EDBi.",
    hints: "meeting = cu\u1ED9c h\u1ECDp; postpone = ho\xE3n l\u1EA1i; delay = d\u1EDDi l\u1EA1i; until next Friday = t\u1EDBi th\u1EE9 S\xE1u",
    answers: [
      "Today's meeting will be postponed until next Friday.",
      "The meeting today is postponed until next Friday.",
      "Today's meeting will be delayed until next Friday."
    ],
    created_date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0]
  },
  {
    id: 13,
    vi: "B\u1EA1n th\u01B0\u1EDDng l\xE0m g\xEC v\xE0o nh\u1EEFng ng\xE0y cu\u1ED1i tu\u1EA7n r\u1EA3nh r\u1ED7i?",
    hints: "free time = th\u1EDDi gian r\u1EA3nh; on weekends = v\xE0o cu\u1ED1i tu\u1EA7n; usually do = th\u01B0\u1EDDng l\xE0m",
    answers: [
      "What do you usually do on your free weekends?",
      "What do you usually do during your free weekends?",
      "What do you often do on the weekend when you are free?"
    ],
    created_date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
    level: "A2"
  },
  {
    id: 14,
    vi: "H\xE3y nh\u1EDB t\u1EAFt \u0111\xE8n v\xE0 \u0111i\u1EC1u h\xF2a tr\u01B0\u1EDBc khi r\u1EDDi kh\u1ECFi v\u0103n ph\xF2ng.",
    hints: "remember to = nh\u1EDB; turn off = t\u1EAFt; air conditioner = \u0111i\u1EC1u h\xF2a; leave = r\u1EDDi kh\u1ECFi",
    answers: [
      "Remember to turn off the lights and air conditioner before leaving the office.",
      "Don't forget to turn off the lights and the air conditioner before you leave the office.",
      "Please remember to turn off lights and air conditioning before leaving the office."
    ],
    created_date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
    level: "A2"
  },
  {
    id: 15,
    vi: "T\xF4i \u0111ang c\u1ED1 g\u1EAFng c\u1EA3i thi\u1EC7n k\u1EF9 n\u0103ng ph\xE1t \xE2m ti\u1EBFng Anh c\u1EE7a m\xECnh m\u1ED7i ng\xE0y.",
    hints: "try to improve = c\u1ED1 g\u1EAFng c\u1EA3i thi\u1EC7n; pronunciation skills = k\u1EF9 n\u0103ng ph\xE1t \xE2m; every day = m\u1ED7i ng\xE0y",
    answers: [
      "I am trying to improve my English pronunciation skills every day.",
      "I'm trying to improve my English pronunciation every single day.",
      "I am working on improving my English pronunciation skills every day."
    ],
    created_date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
    level: "B1"
  },
  {
    id: 16,
    vi: "Gi\xE1 c\u1EE7a chi\u1EBFc m\xE1y t\xEDnh n\xE0y qu\xE1 \u0111\u1EAFt so v\u1EDBi ng\xE2n s\xE1ch c\u1EE7a t\xF4i.",
    hints: "price = gi\xE1 c\u1EA3; expensive = \u0111\u1EAFt \u0111\u1ECF; compared to = so v\u1EDBi; budget = ng\xE2n s\xE1ch",
    answers: [
      "The price of this laptop is too expensive for my budget.",
      "The price of this computer is too high compared to my budget.",
      "This computer is too expensive compared to my budget."
    ],
    created_date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
    level: "A2"
  },
  {
    id: 17,
    vi: "B\u1EA1n c\xF3 phi\u1EC1n n\u1EBFu t\xF4i m\u1EDF c\u1EEDa s\u1ED5 ra m\u1ED9t ch\xFAt kh\xF4ng?",
    hints: "would you mind = b\u1EA1n c\xF3 phi\u1EC1n; open the window = m\u1EDF c\u1EEDa s\u1ED5; a little bit = m\u1ED9t ch\xFAt",
    answers: [
      "Would you mind if I opened the window a little bit?",
      "Do you mind if I open the window a little bit?",
      "Would you mind if I open the window a little?"
    ],
    created_date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
    level: "A2"
  },
  {
    id: 18,
    vi: "Kinh nghi\u1EC7m l\xE0m vi\u1EC7c th\u1EF1c t\u1EBF quan tr\u1ECDng h\u01A1n nhi\u1EC1u so v\u1EDBi l\xFD thuy\u1EBFt.",
    hints: "practical work experience = kinh nghi\u1EC7m th\u1EF1c t\u1EBF; much more important = quan tr\u1ECDng h\u01A1n nhi\u1EC1u; theory = l\xFD thuy\u1EBFt",
    answers: [
      "Practical work experience is much more important than theory.",
      "Real work experience is far more important than theory.",
      "Hands-on experience is much more important than theoretical knowledge."
    ],
    created_date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0]
  },
  {
    id: 19,
    vi: "Ch\xFAng t\xF4i \u0111\xE3 c\xF3 m\u1ED9t chuy\u1EBFn du l\u1ECBch \u0111\xE1ng nh\u1EDB c\xF9ng c\u1EA3 gia \u0111\xECnh.",
    hints: "memorable trip = chuy\u1EBFn \u0111i \u0111\xE1ng nh\u1EDB; with the whole family = c\xF9ng c\u1EA3 gia \u0111\xECnh",
    answers: [
      "We had a memorable trip with the whole family.",
      "We had an unforgettable trip with our whole family.",
      "We enjoyed a memorable vacation with the entire family."
    ],
    created_date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
    level: "A2"
  },
  {
    id: 20,
    vi: "R\u1EA5t vui \u0111\u01B0\u1EE3c h\u1EE3p t\xE1c v\u1EDBi b\u1EA1n trong d\u1EF1 \xE1n \u0111\u1EA7y th\u1EED th\xE1ch n\xE0y.",
    hints: "pleasure = ni\u1EC1m vinh h\u1EA1nh/vui; collaborate = h\u1EE3p t\xE1c; challenging project = d\u1EF1 \xE1n th\u1EED th\xE1ch",
    answers: [
      "It is a pleasure to cooperate with you on this challenging project.",
      "It's a great pleasure to collaborate with you on this challenging project.",
      "I am pleased to work with you on this challenging project."
    ],
    created_date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
    level: "B1"
  },
  {
    id: 21,
    vi: "B\u1EA1n c\xF3 th\u1EC3 gi\u1EDBi thi\u1EC7u cho t\xF4i m\u1ED9t v\xE0i m\xF3n \u0103n \u0111\u1EB7c s\u1EA3n \u1EDF \u0111\xE2y kh\xF4ng?",
    hints: "recommend = gi\u1EDBi thi\u1EC7u/g\u1EE3i \xFD; local specialties = m\xF3n \u0111\u1EB7c s\u1EA3n \u0111\u1ECBa ph\u01B0\u01A1ng; dishes = m\xF3n \u0103n",
    answers: [
      "Can you recommend some local specialties here for me?",
      "Could you recommend some local dishes here to me?",
      "Can you recommend a few special dishes around here?"
    ],
    created_date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
    level: "A2"
  },
  {
    id: 22,
    vi: "T\xF4i th\u01B0\u1EDDng d\xE0nh kho\u1EA3ng ba m\u01B0\u01A1i ph\xFAt m\u1ED7i bu\u1ED5i s\xE1ng \u0111\u1EC3 \u0111\u1ECDc s\xE1ch.",
    hints: "spend time = d\xE0nh th\u1EDDi gian; about thirty minutes = kho\u1EA3ng 30 ph\xFAt; read books = \u0111\u1ECDc s\xE1ch",
    answers: [
      "I usually spend about thirty minutes reading books every morning.",
      "I often spend around 30 minutes reading books each morning.",
      "I usually spend about 30 minutes every morning reading books."
    ],
    created_date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
    level: "A2"
  },
  {
    id: 23,
    vi: "Giao th\xF4ng v\xE0o gi\u1EDD cao \u0111i\u1EC3m \u1EDF th\xE0nh ph\u1ED1 n\xE0y th\u1EF1c s\u1EF1 r\u1EA5t t\u1ED3i t\u1EC7.",
    hints: "traffic = giao th\xF4ng; rush hour = gi\u1EDD cao \u0111i\u1EC3m; really terrible = th\u1EF1c s\u1EF1 t\u1ED3i t\u1EC7",
    answers: [
      "Traffic during rush hour in this city is really terrible.",
      "The rush hour traffic in this city is really awful.",
      "The traffic at rush hour in this city is really bad."
    ],
    created_date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
    level: "A2"
  },
  {
    id: 24,
    vi: "M\u1ECDi s\u1EF1 n\u1ED7 l\u1EF1c v\xE0 ki\xEAn tr\xEC c\u1EE7a b\u1EA1n cu\u1ED1i c\xF9ng r\u1ED3i c\u0169ng s\u1EBD \u0111\u01B0\u1EE3c \u0111\u1EC1n \u0111\xE1p.",
    hints: "effort = s\u1EF1 n\u1ED7 l\u1EF1c; perseverance = s\u1EF1 ki\xEAn tr\xEC; pay off = \u0111\u01B0\u1EE3c \u0111\u1EC1n \u0111\xE1p; in the end = cu\u1ED1i c\xF9ng",
    answers: [
      "All your effort and perseverance will eventually pay off.",
      "All your efforts and persistence will pay off in the end.",
      "Your hard work and perseverance will finally pay off."
    ],
    created_date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0]
  },
  {
    id: 25,
    vi: "T\xF4i mu\u1ED1n ki\u1EC3m tra l\u1EA1i th\xF4ng tin v\xE9 m\xE1y bay c\u1EE7a m\xECnh m\u1ED9t l\u1EA7n n\u1EEFa.",
    hints: "would like to = mu\u1ED1n; double-check = ki\u1EC3m tra l\u1EA1i; flight ticket information = th\xF4ng tin v\xE9 m\xE1y bay",
    answers: [
      "I would like to check my flight ticket information once again.",
      "I want to double-check my flight ticket information one more time.",
      "I'd like to recheck my flight information once again."
    ],
    created_date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0]
  },
  {
    id: 26,
    vi: "B\u1EA1n c\xF3 ngh\u0129 r\u1EB1ng tr\xED tu\u1EC7 nh\xE2n t\u1EA1o s\u1EBD thay \u0111\u1ED5i th\u1EBF gi\u1EDBi trong t\u01B0\u01A1ng lai?",
    hints: "artificial intelligence (AI) = tr\xED tu\u1EC7 nh\xE2n t\u1EA1o; change the world = thay \u0111\u1ED5i th\u1EBF gi\u1EDBi; in the future = trong t\u01B0\u01A1ng lai",
    answers: [
      "Do you think artificial intelligence will change the world in the future?",
      "Do you believe that AI will change the world in the future?",
      "Do you think that artificial intelligence is going to change the world in the future?"
    ],
    created_date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0]
  },
  {
    id: 27,
    vi: "D\xF9 tr\u1EDDi m\u01B0a to, h\u1ECD v\u1EABn quy\u1EBFt \u0111\u1ECBnh ti\u1EBFp t\u1EE5c tr\u1EADn \u0111\u1EA5u b\xF3ng \u0111\xE1.",
    hints: "despite = m\u1EB7c d\xF9; heavy rain = m\u01B0a to; decide to continue = quy\u1EBFt \u0111\u1ECBnh ti\u1EBFp t\u1EE5c; match = tr\u1EADn \u0111\u1EA5u",
    answers: [
      "Despite the heavy rain, they decided to continue the football match.",
      "Although it rained heavily, they decided to continue the soccer match.",
      "In spite of heavy rain, they still decided to go on with the football match."
    ],
    created_date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0]
  },
  {
    id: 28,
    vi: "C\xF4 \u1EA5y lu\xF4n gi\u1EEF th\xE1i \u0111\u1ED9 l\u1EA1c quan v\xE0 t\xEDch c\u1EF1c ngay c\u1EA3 trong nh\u1EEFng l\xFAc kh\xF3 kh\u0103n nh\u1EA5t.",
    hints: "optimistic = l\u1EA1c quan; positive attitude = th\xE1i \u0111\u1ED9 t\xEDch c\u1EF1c; difficult times = l\xFAc kh\xF3 kh\u0103n",
    answers: [
      "She always keeps an optimistic and positive attitude even in the most difficult times.",
      "She always maintains a positive and optimistic attitude even during the hardest times.",
      "She always stays optimistic and positive even in tough situations."
    ],
    created_date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0]
  },
  {
    id: 29,
    vi: "Xin l\u1ED7i v\xEC \u0111\xE3 c\u1EAFt ngang l\u1EDDi b\u1EA1n, nh\u01B0ng t\xF4i c\xF3 m\u1ED9t c\xE2u h\u1ECFi quan tr\u1ECDng.",
    hints: "sorry for interrupting = xin l\u1ED7i v\xEC ng\u1EAFt l\u1EDDi; have an important question = c\xF3 c\xE2u h\u1ECFi quan tr\u1ECDng",
    answers: [
      "Sorry for interrupting you, but I have an important question.",
      "I am sorry to interrupt, but I have an important question.",
      "Pardon me for interrupting, but I have an important question."
    ],
    created_date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0]
  },
  {
    id: 30,
    vi: "H\u1ECDc m\u1ED9t ng\xF4n ng\u1EEF m\u1EDBi \u0111\xF2i h\u1ECFi s\u1EF1 ki\xEAn nh\u1EABn v\xE0 luy\u1EC7n t\u1EADp h\xE0ng ng\xE0y.",
    hints: "learning a new language = h\u1ECDc ng\xF4n ng\u1EEF m\u1EDBi; requires = \u0111\xF2i h\u1ECFi; patience = s\u1EF1 ki\xEAn nh\u1EABn; daily practice = luy\u1EC7n t\u1EADp h\xE0ng ng\xE0y",
    answers: [
      "Learning a new language requires patience and daily practice.",
      "Learning a foreign language requires patience and consistent daily practice.",
      "To learn a new language requires patience and everyday practice."
    ],
    created_date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0]
  },
  {
    id: 31,
    vi: "Ch\xFAc m\u1EEBng b\u1EA1n \u0111\xE3 ho\xE0n th\xE0nh xu\u1EA5t s\u1EAFc b\xE0i thuy\u1EBFt tr\xECnh h\xF4m nay!",
    hints: "congratulations on = ch\xFAc m\u1EEBng v\u1EC1; excellent presentation = b\xE0i thuy\u1EBFt tr\xECnh xu\u1EA5t s\u1EAFc",
    answers: [
      "Congratulations on your excellent presentation today!",
      "Congratulations on completing your presentation excellently today!",
      "Congrats on giving an outstanding presentation today!"
    ],
    created_date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0]
  },
  {
    id: 32,
    vi: "N\u1EBFu b\u1EA1n c\xF3 b\u1EA5t k\u1EF3 th\u1EAFc m\u1EAFc n\xE0o, xin vui l\xF2ng gi\u01A1 tay ph\xE1t bi\u1EC3u.",
    hints: "questions = th\u1EAFc m\u1EAFc; please raise your hand = xin vui l\xF2ng gi\u01A1 tay; speak up = ph\xE1t bi\u1EC3u",
    answers: [
      "If you have any questions, please feel free to raise your hand.",
      "If you have any questions, please raise your hand to speak.",
      "Should you have any questions, please raise your hand."
    ],
    created_date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0]
  },
  {
    id: 33,
    vi: "Ch\xFAng ta n\xEAn t\xECm ra gi\u1EA3i ph\xE1p \u0111\xF4i b\xEAn c\xF9ng c\xF3 l\u1EE3i cho h\u1EE3p \u0111\u1ED3ng n\xE0y.",
    hints: "win-win solution = gi\u1EA3i ph\xE1p \u0111\xF4i b\xEAn c\xF9ng c\xF3 l\u1EE3i; find out = t\xECm ra; contract = h\u1EE3p \u0111\u1ED3ng",
    answers: [
      "We should find a win-win solution for this contract.",
      "We need to figure out a win-win solution for this deal.",
      "We ought to find a mutually beneficial solution for this contract."
    ],
    created_date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0]
  },
  {
    id: 34,
    vi: "T\xF4i th\u01B0\u1EDDng u\u1ED1ng m\u1ED9t ly n\u01B0\u1EDBc \u1EA5m ngay sau khi th\u1EE9c d\u1EADy v\xE0o bu\u1ED5i s\xE1ng.",
    hints: "glass of warm water = ly n\u01B0\u1EDBc \u1EA5m; right after = ngay sau khi; wake up = th\u1EE9c d\u1EADy",
    answers: [
      "I usually drink a glass of warm water right after waking up in the morning.",
      "I often drink a cup of warm water right after I wake up in the morning.",
      "I usually have a glass of warm water immediately after waking up."
    ],
    created_date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0]
  },
  {
    id: 35,
    vi: "S\u1EF1 th\xE0nh c\xF4ng c\u1EE7a b\u1EA1n h\xF4m nay l\xE0 ph\u1EA7n th\u01B0\u1EDFng x\u1EE9ng \u0111\xE1ng cho m\u1ECDi n\u1ED7 l\u1EF1c.",
    hints: "success = s\u1EF1 th\xE0nh c\xF4ng; well-deserved reward = ph\u1EA7n th\u01B0\u1EDFng x\u1EE9ng \u0111\xE1ng; efforts = n\u1ED7 l\u1EF1c",
    answers: [
      "Your success today is a well-deserved reward for all your efforts.",
      "Your success today is well-deserved for all your hard work.",
      "Your achievement today is a well-deserved reward for your continuous effort."
    ],
    created_date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
    category: "general"
  },
  // ================= CÔNG NGHỆ THÔNG TIN & LẬP TRÌNH (IT / TECH) - DÀNH RIÊNG CHO VIP =================
  {
    id: 101,
    vi: "T\xF4i v\u1EEBa t\u1EA1o m\u1ED9t Pull Request m\u1EDBi, b\u1EA1n c\xF3 th\u1EC3 review code gi\xFAp t\xF4i \u0111\u01B0\u1EE3c kh\xF4ng?",
    hints: "created a new pull request = v\u1EEBa t\u1EA1o m\u1ED9t PR; could you please = b\u1EA1n c\xF3 th\u1EC3 vui l\xF2ng; review my code = xem x\xE9t code c\u1EE7a t\xF4i",
    answers: [
      "I just created a new pull request, could you please review my code?",
      "I have just submitted a pull request, can you review my code?",
      "I just opened a pull request, could you help me review the code?"
    ],
    created_date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
    category: "it"
  },
  {
    id: 102,
    vi: "H\u1EC7 th\u1ED1ng \u0111ang g\u1EB7p l\u1ED7i 500 khi g\u1ECDi API thanh to\xE1n tr\xEAn m\xF4i tr\u01B0\u1EDDng production.",
    hints: "encountering a 500 error = g\u1EB7p l\u1ED7i 500; calling the payment API = g\u1ECDi API thanh to\xE1n; on production = tr\xEAn m\xF4i tr\u01B0\u1EDDng production",
    answers: [
      "The system is encountering a 500 internal server error when calling the payment API on production.",
      "The system is throwing a 500 error when calling the payment API in production.",
      "Our system has a 500 error when calling the payment API on the production environment."
    ],
    created_date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
    category: "it"
  },
  {
    id: 103,
    vi: "Ch\xFAng ta c\u1EA7n t\u1ED1i \u01B0u h\xF3a c\xE2u truy v\u1EA5n c\u01A1 s\u1EDF d\u1EEF li\u1EC7u \u0111\u1EC3 gi\u1EA3m th\u1EDDi gian ph\u1EA3n h\u1ED3i.",
    hints: "optimize = t\u1ED1i \u01B0u h\xF3a; database queries = c\xE2u truy v\u1EA5n database; reduce response time = gi\u1EA3m th\u1EDDi gian ph\u1EA3n h\u1ED3i",
    answers: [
      "We need to optimize the database queries to reduce the response time.",
      "We must optimize our database query to decrease response time.",
      "We should optimize database queries in order to speed up the response time."
    ],
    created_date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
    category: "it"
  },
  {
    id: 104,
    vi: "Bu\u1ED5i h\u1ECDp Daily Scrum s\xE1ng nay s\u1EBD b\u1EAFt \u0111\u1EA7u \u0111\xFAng 9 gi\u1EDD 30 ph\xFAt.",
    hints: "Daily Scrum meeting = bu\u1ED5i h\u1ECDp Daily Scrum; this morning = s\xE1ng nay; start sharp at = b\u1EAFt \u0111\u1EA7u \u0111\xFAng",
    answers: [
      "The Daily Scrum meeting this morning will start at 9:30 AM sharp.",
      "Our Daily Scrum meeting will begin at 9:30 AM this morning.",
      "This morning Daily Scrum meeting will start at 9:30 AM."
    ],
    created_date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
    category: "it"
  },
  {
    id: 105,
    vi: "B\u1EA1n \u0111\xE3 ki\u1EC3m tra xem bug n\xE0y c\xF3 th\u1EC3 t\xE1i hi\u1EC7n \u0111\u01B0\u1EE3c tr\xEAn tr\xECnh duy\u1EC7t Safari kh\xF4ng?",
    hints: "have you checked = b\u1EA1n \u0111\xE3 ki\u1EC3m tra ch\u01B0a; reproduce this bug = t\xE1i hi\u1EC7n l\u1ED7i n\xE0y; on Safari browser = tr\xEAn tr\xECnh duy\u1EC7t Safari",
    answers: [
      "Have you checked if this bug can be reproduced on Safari browser?",
      "Did you check whether this bug is reproducible on Safari?",
      "Have you verified if this bug can be reproduced on Safari?"
    ],
    created_date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
    category: "it"
  },
  {
    id: 106,
    vi: "Phi\xEAn b\u1EA3n m\u1EDBi \u0111\xE3 \u0111\u01B0\u1EE3c deploy l\xEAn server staging th\xE0nh c\xF4ng m\xE0 kh\xF4ng c\xF3 l\u1ED7i n\xE0o.",
    hints: "new version = phi\xEAn b\u1EA3n m\u1EDBi; deployed to staging server = \u0111\u01B0\u1EE3c deploy l\xEAn staging; without any errors = kh\xF4ng c\xF3 l\u1ED7i n\xE0o",
    answers: [
      "The new version has been deployed to the staging server successfully without any errors.",
      "The new release was successfully deployed to the staging environment with zero bugs.",
      "The latest version has been deployed to staging successfully without errors."
    ],
    created_date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
    category: "it"
  },
  {
    id: 107,
    vi: "C\u01A1 s\u1EDF d\u1EEF li\u1EC7u \u0111ang b\u1ECB t\u1EAFc ngh\u1EBDn do c\xF3 qu\xE1 nhi\u1EC1u truy v\u1EA5n ch\u1EA1y \u0111\u1ED3ng th\u1EDDi.",
    hints: "database = c\u01A1 s\u1EDF d\u1EEF li\u1EC7u; bottleneck/congested = t\u1EAFc ngh\u1EBDn; concurrent queries = truy v\u1EA5n \u0111\u1ED3ng th\u1EDDi",
    answers: [
      "The database is congested due to too many concurrent queries running.",
      "Our database has a bottleneck because too many queries are running simultaneously.",
      "The database is experiencing a bottleneck due to multiple concurrent queries."
    ],
    created_date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
    category: "it"
  },
  {
    id: 108,
    vi: "Ch\xFAng ta c\u1EA7n refactor \u0111o\u1EA1n code n\xE0y \u0111\u1EC3 c\u1EA3i thi\u1EC7n hi\u1EC7u n\u0103ng v\xE0 t\xEDnh b\u1EA3o tr\xEC.",
    hints: "refactor this code = t\xE1i c\u1EA5u tr\xFAc code n\xE0y; improve performance = c\u1EA3i thi\u1EC7n hi\u1EC7u n\u0103ng; maintainability = t\xEDnh d\u1EC5 b\u1EA3o tr\xEC",
    answers: [
      "We need to refactor this code to improve performance and maintainability.",
      "We should refactor this piece of code to enhance performance and maintainability.",
      "We have to refactor this code for better performance and maintainability."
    ],
    created_date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
    category: "it"
  },
  {
    id: 109,
    vi: "T\xF4i v\u1EEBa t\u1EA1o m\u1ED9t pull request m\u1EDBi, nh\u1EDD b\u1EA1n review gi\xFAp t\xF4i khi r\u1EA3nh nh\xE9.",
    hints: "create a pull request = t\u1EA1o pull request; review for me = review gi\xFAp t\xF4i; when you have time = khi b\u1EA1n r\u1EA3nh",
    answers: [
      "I just created a new pull request, please review it for me when you have time.",
      "I have just opened a new PR, could you please review it when you are free?",
      "I just submitted a new pull request, please help review it when you have a moment."
    ],
    created_date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
    category: "it"
  },
  {
    id: 110,
    vi: "API n\xE0y y\xEAu c\u1EA7u x\xE1c th\u1EF1c qua JSON Web Token trong header c\u1EE7a request.",
    hints: "API requires authentication = API y\xEAu c\u1EA7u x\xE1c th\u1EF1c; via JWT = qua token; in request header = trong header",
    answers: [
      "This API requires authentication via JSON Web Token in the request header.",
      "The API requires JWT authentication in the authorization header of the request.",
      "This API needs authentication using a JSON Web Token in the request headers."
    ],
    created_date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
    category: "it"
  },
  // ================= KINH DOANH & BÁN HÀNG (BUSINESS & SALES) - DÀNH RIÊNG CHO VIP =================
  {
    id: 201,
    vi: "Ch\xFAng t\xF4i r\u1EA5t mong mu\u1ED1n \u0111\u01B0\u1EE3c h\u1EE3p t\xE1c l\xE2u d\xE0i v\u1EDBi c\xF4ng ty c\u1EE7a b\u1EA1n trong d\u1EF1 \xE1n n\xE0y.",
    hints: "look forward to = mong mu\u1ED1n/tr\xF4ng \u0111\u1EE3i; long-term partnership = quan h\u1EC7 h\u1EE3p t\xE1c l\xE2u d\xE0i; with your company = v\u1EDBi c\xF4ng ty b\u1EA1n",
    answers: [
      "We look forward to a long-term partnership with your company in this project.",
      "We are looking forward to cooperating with your company for the long term on this project.",
      "We really hope to establish a long-term collaboration with your company."
    ],
    created_date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
    category: "business"
  },
  {
    id: 202,
    vi: "N\u1EBFu b\u1EA1n \u0111\u1ED3ng \xFD k\xFD h\u1EE3p \u0111\u1ED3ng h\xF4m nay, ch\xFAng t\xF4i s\u1EBD chi\u1EBFt kh\u1EA5u 15% cho \u0111\u01A1n h\xE0ng \u0111\u1EA7u ti\xEAn.",
    hints: "agree to sign the contract = \u0111\u1ED3ng \xFD k\xFD h\u1EE3p \u0111\u1ED3ng; offer a 15% discount = chi\u1EBFt kh\u1EA5u 15%; first order = \u0111\u01A1n h\xE0ng \u0111\u1EA7u ti\xEAn",
    answers: [
      "If you agree to sign the contract today, we will offer a 15% discount on your first order.",
      "If you sign the deal today, we can offer a 15% discount for the first order.",
      "Should you agree to sign the contract today, we will give a 15% discount on the first order."
    ],
    created_date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
    category: "business"
  },
  {
    id: 203,
    vi: "Doanh thu qu\xFD n\xE0y \u0111\xE3 t\u0103ng tr\u01B0\u1EDFng 25% so v\u1EDBi c\xF9ng k\u1EF3 n\u0103m ngo\xE1i.",
    hints: "revenue this quarter = doanh thu qu\xFD n\xE0y; grew by 25% = t\u0103ng tr\u01B0\u1EDFng 25%; compared to the same period last year = so v\u1EDBi c\xF9ng k\u1EF3 n\u0103m ngo\xE1i",
    answers: [
      "Revenue this quarter grew by 25% compared to the same period last year.",
      "Our revenue for this quarter increased by 25% year-over-year.",
      "This quarter revenue has increased by 25% compared to the same period of last year."
    ],
    created_date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
    category: "business"
  },
  {
    id: 204,
    vi: "H\xE3y g\u1EEDi cho t\xF4i b\u1EA3n b\xE1o gi\xE1 chi ti\u1EBFt v\xE0 c\xE1c \u0111i\u1EC1u kho\u1EA3n thanh to\xE1n tr\u01B0\u1EDBc 5 gi\u1EDD chi\u1EC1u.",
    hints: "detailed quotation = b\u1EA3n b\xE1o gi\xE1 chi ti\u1EBFt; payment terms = \u0111i\u1EC1u kho\u1EA3n thanh to\xE1n; before 5 PM = tr\u01B0\u1EDBc 5 gi\u1EDD chi\u1EC1u",
    answers: [
      "Please send me the detailed quotation and payment terms before 5 PM.",
      "Could you send me a detailed price quote and payment terms by 5 PM?",
      "Please provide the detailed quote along with payment terms prior to 5 PM."
    ],
    created_date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
    category: "business"
  },
  {
    id: 205,
    vi: "M\u1EE5c ti\xEAu ch\xEDnh c\u1EE7a chi\u1EBFn d\u1ECBch marketing l\u1EA7n n\xE0y l\xE0 ti\u1EBFp c\u1EADn nh\xF3m kh\xE1ch h\xE0ng tr\u1EBB tu\u1ED5i.",
    hints: "primary goal = m\u1EE5c ti\xEAu ch\xEDnh; marketing campaign = chi\u1EBFn d\u1ECBch marketing; target young audience = ti\u1EBFp c\u1EADn kh\xE1ch h\xE0ng tr\u1EBB",
    answers: [
      "The primary goal of this marketing campaign is to reach the younger customer segment.",
      "The main objective of this marketing campaign is targeting young customers.",
      "The key goal of this campaign is to reach young potential clients."
    ],
    created_date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
    category: "business"
  },
  {
    id: 206,
    vi: "Ch\xFAng ta c\u1EA7n chu\u1EA9n b\u1ECB b\xE0i thuy\u1EBFt tr\xECnh th\u1EADt \u1EA5n t\u01B0\u1EE3ng cho bu\u1ED5i g\u1EB7p g\u1EE1 nh\xE0 \u0111\u1EA7u t\u01B0 ng\xE0y mai.",
    hints: "prepare an impressive pitch deck = chu\u1EA9n b\u1ECB b\xE0i thuy\u1EBFt tr\xECnh \u1EA5n t\u01B0\u1EE3ng; investor meeting = bu\u1ED5i g\u1EB7p nh\xE0 \u0111\u1EA7u t\u01B0; tomorrow = ng\xE0y mai",
    answers: [
      "We need to prepare an impressive presentation for tomorrow investor meeting.",
      "We must prepare a very convincing pitch for the meeting with investors tomorrow.",
      "We have to prepare an impressive presentation for the investor meeting tomorrow."
    ],
    created_date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
    category: "business"
  },
  {
    id: 207,
    vi: "Sau khi ph\xE2n t\xEDch th\u1ECB tr\u01B0\u1EDDng, ch\xFAng t\xF4i quy\u1EBFt \u0111\u1ECBnh m\u1EDF r\u1ED9ng chi nh\xE1nh sang khu v\u1EF1c \u0110\xF4ng Nam \xC1.",
    hints: "after market analysis = sau ph\xE2n t\xEDch th\u1ECB tr\u01B0\u1EDDng; expand branches = m\u1EDF r\u1ED9ng chi nh\xE1nh; Southeast Asia = \u0110\xF4ng Nam \xC1",
    answers: [
      "After analyzing the market, we decided to expand our branches into Southeast Asia.",
      "Following the market analysis, we decided to expand into Southeast Asian region.",
      "After market research, we made the decision to expand our business to Southeast Asia."
    ],
    created_date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
    category: "business"
  },
  {
    id: 208,
    vi: "Kh\xE1ch h\xE0ng y\xEAu c\u1EA7u ch\xFAng t\xF4i ho\xE0n ti\u1EC1n v\xEC \u0111\u01A1n h\xE0ng b\u1ECB giao tr\u1EC5 h\u01A1n hai tu\u1EA7n.",
    hints: "client demanded a refund = kh\xE1ch h\xE0ng \u0111\xF2i ho\xE0n ti\u1EC1n; order was delayed = \u0111\u01A1n h\xE0ng b\u1ECB tr\u1EC5; more than two weeks = h\u01A1n hai tu\u1EA7n",
    answers: [
      "The client requested a refund because the order was delayed by more than two weeks.",
      "The customer demanded a full refund due to the order being over two weeks late.",
      "Clients asked for a refund since the shipment was delayed by more than two weeks."
    ],
    created_date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
    category: "business"
  },
  {
    id: 209,
    vi: "Chi ph\xED s\u1EA3n xu\u1EA5t \u0111\xE3 gi\u1EA3m 10% nh\u1EDD vi\u1EC7c t\u1EF1 \u0111\u1ED9ng h\xF3a d\xE2y chuy\u1EC1n \u0111\xF3ng g\xF3i.",
    hints: "production costs = chi ph\xED s\u1EA3n xu\u1EA5t; decreased by 10% = gi\u1EA3m 10%; thanks to automating = nh\u1EDD t\u1EF1 \u0111\u1ED9ng h\xF3a; packaging line = d\xE2y chuy\u1EC1n \u0111\xF3ng g\xF3i",
    answers: [
      "Production costs decreased by 10% thanks to automating the packaging line.",
      "Manufacturing costs dropped by 10% due to the automation of our packaging process.",
      "Production expenses went down by 10% through automating the packaging line."
    ],
    created_date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
    category: "business"
  },
  {
    id: 210,
    vi: "Ch\xFAng t\xF4i c\u1EA7n xem x\xE9t l\u1EA1i \u0111i\u1EC1u kho\u1EA3n b\u1EA3o m\u1EADt th\xF4ng tin tr\u01B0\u1EDBc khi k\xFD th\u1ECFa thu\u1EADn h\u1EE3p t\xE1c.",
    hints: "review confidentiality terms = xem l\u1EA1i \u0111i\u1EC1u kho\u1EA3n b\u1EA3o m\u1EADt; before signing = tr\u01B0\u1EDBc khi k\xFD; partnership agreement = th\u1ECFa thu\u1EADn h\u1EE3p t\xE1c",
    answers: [
      "We need to review the confidentiality terms before signing the partnership agreement.",
      "We must review the non-disclosure clause before finalizing the cooperation agreement.",
      "We have to check the confidentiality agreement before signing the partnership contract."
    ],
    created_date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
    category: "business"
  },
  // ================= KHÁCH SẠN, NHÀ HÀNG & DU LỊCH (HOSPITALITY) - DÀNH RIÊNG CHO VIP =================
  {
    id: 301,
    vi: "Ch\xE0o m\u1EEBng qu\xFD kh\xE1ch \u0111\u1EBFn v\u1EDBi kh\xE1ch s\u1EA1n, t\xF4i c\xF3 th\u1EC3 xin ph\xE9p xem h\u1ED9 chi\u1EBFu c\u1EE7a b\u1EA1n \u0111\u01B0\u1EE3c kh\xF4ng?",
    hints: "welcome to our hotel = ch\xE0o m\u1EEBng \u0111\u1EBFn kh\xE1ch s\u1EA1n; may I have/see = t\xF4i c\xF3 th\u1EC3 xem; your passport = h\u1ED9 chi\u1EBFu c\u1EE7a b\u1EA1n",
    answers: [
      "Welcome to our hotel, may I please see your passport?",
      "Welcome to our hotel, could I have your passport, please?",
      "Welcome to the hotel, can I check your passport, please?"
    ],
    created_date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
    category: "hospitality"
  },
  {
    id: 302,
    vi: "B\u1EEFa s\xE1ng buffet mi\u1EC5n ph\xED s\u1EBD \u0111\u01B0\u1EE3c ph\u1EE5c v\u1EE5 t\u1EA1i nh\xE0 h\xE0ng t\u1EA7ng hai t\u1EEB 6 gi\u1EDD \u0111\u1EBFn 10 gi\u1EDD s\xE1ng.",
    hints: "complimentary buffet breakfast = b\u1EEFa s\xE1ng buffet mi\u1EC5n ph\xED; second floor restaurant = nh\xE0 h\xE0ng t\u1EA7ng 2; from 6 AM to 10 AM",
    answers: [
      "Complimentary buffet breakfast is served at the second floor restaurant from 6 AM to 10 AM.",
      "Free buffet breakfast will be served in the restaurant on the second floor between 6:00 AM and 10:00 AM.",
      "The complimentary breakfast buffet is served on the second floor from 6 AM to 10 AM."
    ],
    created_date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
    category: "hospitality"
  },
  {
    id: 303,
    vi: "Ch\xFAng t\xF4i v\xF4 c\xF9ng xin l\u1ED7i v\xEC s\u1EF1 b\u1EA5t ti\u1EC7n n\xE0y, ch\xFAng t\xF4i xin ph\xE9p n\xE2ng c\u1EA5p ph\xF2ng mi\u1EC5n ph\xED cho b\u1EA1n.",
    hints: "sincerely apologize = ch\xE2n th\xE0nh xin l\u1ED7i; for this inconvenience = v\xEC s\u1EF1 b\u1EA5t ti\u1EC7n n\xE0y; complimentary room upgrade = n\xE2ng c\u1EA5p ph\xF2ng mi\u1EC5n ph\xED",
    answers: [
      "We sincerely apologize for this inconvenience, and we would like to offer you a complimentary room upgrade.",
      "We are very sorry for the inconvenience, we will upgrade your room free of charge.",
      "We deeply apologize for this inconvenience and are happy to provide a free room upgrade for you."
    ],
    created_date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
    category: "hospitality"
  },
  {
    id: 304,
    vi: "Qu\xFD kh\xE1ch c\xF3 c\u1EA7n nh\xE2n vi\xEAn ch\xFAng t\xF4i h\u1ED7 tr\u1EE3 mang h\xE0nh l\xFD l\xEAn ph\xF2ng kh\xF4ng?",
    hints: "would you like = qu\xFD kh\xE1ch c\xF3 mu\u1ED1n; our bellman/staff = nh\xE2n vi\xEAn; help with your luggage = h\u1ED7 tr\u1EE3 h\xE0nh l\xFD; up to your room",
    answers: [
      "Would you like our staff to help you with your luggage up to your room?",
      "Do you need assistance with your luggage to your room?",
      "Would you like the bellman to assist with your luggage to your room?"
    ],
    created_date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
    category: "hospitality"
  },
  {
    id: 305,
    vi: "M\xF3n \u0103n \u0111\u1EB7c s\u1EA3n c\u1EE7a b\u1EBFp tr\u01B0\u1EDFng h\xF4m nay l\xE0 c\xE1 h\u1ED3i \xE1p ch\u1EA3o s\u1ED1t b\u01A1 chanh.",
    hints: "chef special of the day = m\xF3n \u0111\u1EB7c s\u1EA3n c\u1EE7a b\u1EBFp tr\u01B0\u1EDFng h\xF4m nay; pan-seared salmon = c\xE1 h\u1ED3i \xE1p ch\u1EA3o; lemon butter sauce = s\u1ED1t b\u01A1 chanh",
    answers: [
      "Today's chef special is pan-seared salmon with lemon butter sauce.",
      "The chef recommendation today is pan-seared salmon served with lemon butter sauce.",
      "Our chef special for today is pan-fried salmon with lemon butter sauce."
    ],
    created_date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
    category: "hospitality"
  },
  {
    id: 306,
    vi: "Xin vui l\xF2ng cho t\xF4i bi\u1EBFt n\u1EBFu qu\xFD kh\xE1ch c\xF3 b\u1EA5t k\u1EF3 y\xEAu c\u1EA7u ki\xEAng khem ho\u1EB7c d\u1ECB \u1EE9ng th\u1EF1c ph\u1EA9m n\xE0o.",
    hints: "please let me know = vui l\xF2ng cho t\xF4i bi\u1EBFt; dietary restrictions = y\xEAu c\u1EA7u ki\xEAng khem; food allergies = d\u1ECB \u1EE9ng th\u1EF1c ph\u1EA9m",
    answers: [
      "Please let me know if you have any dietary restrictions or food allergies.",
      "Kindly inform us if you have any food allergies or special dietary requirements.",
      "Please tell me if you have any dietary requirements or are allergic to any ingredients."
    ],
    created_date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
    category: "hospitality"
  },
  {
    id: 307,
    vi: "Qu\u1EA7y l\u1EC5 t\xE2n ph\u1EE5c v\u1EE5 24/7, qu\xFD kh\xE1ch c\xF3 th\u1EC3 li\xEAn h\u1EC7 s\u1ED1 m\xE1y nh\xE1nh 0 b\u1EA5t k\u1EF3 l\xFAc n\xE0o.",
    hints: "front desk operates 24/7 = qu\u1EA7y l\u1EC5 t\xE2n ph\u1EE5c v\u1EE5 24/7; contact extension 0 = g\u1ECDi m\xE1y nh\xE1nh 0; at any time = b\u1EA5t k\u1EF3 l\xFAc n\xE0o",
    answers: [
      "The front desk operates 24/7, you can dial extension 0 at any time.",
      "Our front desk is available 24 hours a day, feel free to contact extension 0 anytime.",
      "Reception is open 24/7, please call extension 0 whenever you need assistance."
    ],
    created_date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
    category: "hospitality"
  },
  {
    id: 308,
    vi: "Ch\xFAng t\xF4i c\xF3 d\u1ECBch v\u1EE5 xe \u0111\u01B0a \u0111\xF3n s\xE2n bay mi\u1EC5n ph\xED cho kh\xE1ch \u0111\u1EB7t ph\xF2ng t\u1EEB ba \u0111\xEAm tr\u1EDF l\xEAn.",
    hints: "complimentary airport shuttle = xe \u0111\u01B0a \u0111\xF3n s\xE2n bay mi\u1EC5n ph\xED; for guests staying = cho kh\xE1ch l\u01B0u tr\xFA; three nights or more = t\u1EEB ba \u0111\xEAm tr\u1EDF l\xEAn",
    answers: [
      "We offer complimentary airport shuttle service for guests staying three nights or more.",
      "Free airport shuttle is provided for guests booking three nights or more.",
      "A complimentary airport transfer is available for stays of three nights or longer."
    ],
    created_date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
    category: "hospitality"
  },
  {
    id: 309,
    vi: "H\u1ED3 b\u01A1i v\xF4 c\u1EF1c tr\xEAn t\u1EA7ng th\u01B0\u1EE3ng m\u1EDF c\u1EEDa t\u1EEB 6 gi\u1EDD s\xE1ng \u0111\u1EBFn 9 gi\u1EDD t\u1ED1i h\xE0ng ng\xE0y.",
    hints: "rooftop infinity pool = h\u1ED3 b\u01A1i v\xF4 c\u1EF1c t\u1EA7ng th\u01B0\u1EE3ng; open daily = m\u1EDF c\u1EEDa h\xE0ng ng\xE0y; from 6 AM to 9 PM",
    answers: [
      "The rooftop infinity pool is open daily from 6 AM to 9 PM.",
      "Our rooftop infinity swimming pool is available every day from 6:00 AM to 9:00 PM.",
      "The infinity pool on the rooftop opens from 6 AM to 9 PM daily."
    ],
    created_date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
    category: "hospitality"
  },
  {
    id: 310,
    vi: "Gi\u1EDD tr\u1EA3 ph\xF2ng ti\xEAu chu\u1EA9n l\xE0 12 gi\u1EDD tr\u01B0a, qu\xFD kh\xE1ch c\xF3 mu\u1ED1n y\xEAu c\u1EA7u tr\u1EA3 ph\xF2ng mu\u1ED9n kh\xF4ng?",
    hints: "standard checkout time = gi\u1EDD tr\u1EA3 ph\xF2ng ti\xEAu chu\u1EA9n; 12 PM/noon = 12 gi\u1EDD tr\u01B0a; request late checkout = y\xEAu c\u1EA7u tr\u1EA3 ph\xF2ng mu\u1ED9n",
    answers: [
      "Standard checkout time is 12 noon, would you like to request a late checkout?",
      "Check-out is at 12:00 PM, do you wish to ask for a late checkout?",
      "The standard checkout time is 12:00 PM, would you like to arrange a late checkout?"
    ],
    created_date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
    category: "hospitality",
    level: "B2"
  },
  // BỔ SUNG CÁC CÂU HỎI TRÌNH ĐỘ A1 (CƠ BẢN / MỚI BẮT ĐẦU)
  {
    id: 401,
    vi: "Xin ch\xE0o, t\xF4i c\xF3 th\u1EC3 ng\u1ED3i \u1EDF v\u1ECB tr\xED n\xE0y \u0111\u01B0\u1EE3c kh\xF4ng?",
    hints: "may I = t\xF4i c\xF3 th\u1EC3; sit here = ng\u1ED3i \u1EDF \u0111\xE2y; excuse me = xin l\u1ED7i/xin ch\xE0o",
    answers: [
      "Excuse me, may I sit here?",
      "Hello, can I sit here?",
      "Excuse me, is this seat taken?",
      "Can I sit here, please?"
    ],
    created_date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
    category: "general",
    level: "A1"
  },
  {
    id: 402,
    vi: "B\xE2y gi\u1EDD l\xE0 m\u1EA5y gi\u1EDD r\u1ED3i b\u1EA1n \u01A1i?",
    hints: "what time is it = b\xE2y gi\u1EDD l\xE0 m\u1EA5y gi\u1EDD; excuse me = xin l\u1ED7i b\u1EA1n \u01A1i",
    answers: [
      "What time is it now?",
      "What time is it, please?",
      "Do you have the time?",
      "Excuse me, what time is it?"
    ],
    created_date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
    category: "general",
    level: "A1"
  },
  {
    id: 403,
    vi: "T\xF4i th\u1EE9c d\u1EADy l\xFAc s\xE1u gi\u1EDD s\xE1ng m\u1ED7i ng\xE0y.",
    hints: "wake up = th\u1EE9c d\u1EADy; at 6 AM = l\xFAc 6 gi\u1EDD s\xE1ng; every day = m\u1ED7i ng\xE0y",
    answers: [
      "I wake up at six in the morning every day.",
      "I wake up at 6 AM every day.",
      "I get up at six AM every morning.",
      "I wake up at 6:00 AM every day."
    ],
    created_date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
    category: "general",
    level: "A1"
  },
  {
    id: 404,
    vi: "T\xF4i mu\u1ED1n g\u1ECDi m\u1ED9t ly n\u01B0\u1EDBc cam \xE9p.",
    hints: "would like = mu\u1ED1n; a glass of = m\u1ED9t ly; orange juice = n\u01B0\u1EDBc cam \xE9p",
    answers: [
      "I would like a glass of orange juice.",
      "I'd like a glass of orange juice, please.",
      "Can I have a glass of orange juice, please?",
      "I want a glass of fresh orange juice."
    ],
    created_date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
    category: "general",
    level: "A1"
  },
  {
    id: 405,
    vi: "Nh\xE0 v\u1EC7 sinh \u1EDF \u0111\xE2u v\u1EADy, l\xE0m \u01A1n ch\u1EC9 gi\xFAp t\xF4i?",
    hints: "where is the restroom = nh\xE0 v\u1EC7 sinh \u1EDF \u0111\xE2u; please = l\xE0m \u01A1n",
    answers: [
      "Where is the restroom, please?",
      "Where is the bathroom, please?",
      "Excuse me, where is the toilet?",
      "Could you tell me where the restroom is, please?"
    ],
    created_date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
    category: "general",
    level: "A1"
  },
  // BỔ SUNG CÁC CÂU HỎI TRÌNH ĐỘ A2 (SƠ CẤP / TÌNH HUỐNG THỰC TẾ)
  {
    id: 406,
    vi: "Cu\u1ED1i tu\u1EA7n tr\u01B0\u1EDBc t\xF4i \u0111\xE3 \u0111i xem phim c\xF9ng b\u1EA1n th\xE2n c\u1EE7a m\xECnh.",
    hints: "last weekend = cu\u1ED1i tu\u1EA7n tr\u01B0\u1EDBc; went to see a movie = \u0111i xem phim; best friend = b\u1EA1n th\xE2n",
    answers: [
      "Last weekend I went to see a movie with my best friend.",
      "I went to the cinema with my best friend last weekend.",
      "Last weekend, I watched a movie with my best friend."
    ],
    created_date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
    category: "general",
    level: "A2"
  },
  {
    id: 407,
    vi: "Si\xEAu th\u1ECB g\u1EA7n nh\u1EA5t c\xE1ch \u0111\xE2y kho\u1EA3ng n\u0103m tr\u0103m m\xE9t, b\u1EA1n c\u1EE9 \u0111i th\u1EB3ng l\xE0 t\u1EDBi.",
    hints: "nearest supermarket = si\xEAu th\u1ECB g\u1EA7n nh\u1EA5t; 500 meters away = c\xE1ch 500m; go straight = \u0111i th\u1EB3ng",
    answers: [
      "The nearest supermarket is about 500 meters away, just go straight.",
      "The closest supermarket is about five hundred meters away, just walk straight.",
      "The nearest supermarket is around 500 meters from here, go straight ahead."
    ],
    created_date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
    category: "general",
    level: "A2"
  },
  {
    id: 408,
    vi: "Chi\u1EBFc \xE1o s\u01A1 mi n\xE0y c\xF3 k\xEDch c\u1EE1 l\u1EDBn h\u01A1n kh\xF4ng \u1EA1?",
    hints: "this shirt = chi\u1EBFc \xE1o n\xE0y; larger size / bigger size = c\u1EE1 l\u1EDBn h\u01A1n; do you have = b\u1EA1n c\xF3 ... kh\xF4ng",
    answers: [
      "Do you have this shirt in a larger size?",
      "Do you have this shirt in a bigger size?",
      "Is there a larger size for this shirt?"
    ],
    created_date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
    category: "general",
    level: "A2"
  },
  {
    id: 409,
    vi: "H\xF4m nay t\xF4i th\u1EA5y h\u01A1i m\u1EC7t trong ng\u01B0\u1EDDi, t\xF4i c\xF3 th\u1EC3 xin ph\xE9p v\u1EC1 s\u1EDBm m\u1ED9t ch\xFAt \u0111\u01B0\u1EE3c kh\xF4ng?",
    hints: "feel a bit tired = th\u1EA5y h\u01A1i m\u1EC7t; leave early = v\u1EC1 s\u1EDBm; may I = t\xF4i c\xF3 th\u1EC3 xin ph\xE9p",
    answers: [
      "I feel a bit tired today, may I leave a little early?",
      "I'm feeling a little tired today, could I leave early?",
      "I feel slightly unwell today, can I leave a bit early?"
    ],
    created_date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
    category: "general",
    level: "A2"
  },
  {
    id: 410,
    vi: "T\xF4i th\u01B0\u1EDDng t\u1EF1 n\u1EA5u \u0103n \u1EDF nh\xE0 v\xE0o c\xE1c bu\u1ED5i t\u1ED1i trong tu\u1EA7n \u0111\u1EC3 ti\u1EBFt ki\u1EC7m chi ph\xED.",
    hints: "cook at home = n\u1EA5u \u0103n \u1EDF nh\xE0; on weekday evenings = c\xE1c t\u1ED1i trong tu\u1EA7n; save money = ti\u1EBFt ki\u1EC7m ti\u1EC1n",
    answers: [
      "I usually cook at home on weekday evenings to save money.",
      "I often cook at home on weeknights to save expenses.",
      "I normally prepare meals at home on weekday evenings to save money."
    ],
    created_date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
    category: "general",
    level: "A2"
  },
  // BỔ SUNG CÁC CÂU HỎI TRÌNH ĐỘ C1 (CAO CẤP / ĐÀM PHÁN & VĂN PHONG CHUYÊN NGHIỆP)
  {
    id: 411,
    vi: "Chi\u1EBFn l\u01B0\u1EE3c \u0111\xE0m ph\xE1n linh ho\u1EA1t \u0111\xE3 gi\xFAp ch\xFAng t\xF4i \u0111\u1EA1t \u0111\u01B0\u1EE3c th\u1ECFa thu\u1EADn mang t\xEDnh \u0111\u1ED9t ph\xE1.",
    hints: "flexible negotiation strategy = chi\u1EBFn l\u01B0\u1EE3c \u0111\xE0m ph\xE1n linh ho\u1EA1t; groundbreaking agreement = th\u1ECFa thu\u1EADn \u0111\u1ED9t ph\xE1",
    answers: [
      "A flexible negotiation strategy helped us achieve a groundbreaking agreement.",
      "Our flexible negotiation strategy enabled us to reach a breakthrough deal.",
      "The flexible bargaining strategy allowed us to secure a groundbreaking agreement."
    ],
    created_date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
    category: "business",
    level: "C1"
  },
  {
    id: 412,
    vi: "S\u1EF1 chuy\u1EC3n d\u1ECBch c\u1EE7a chu\u1ED7i cung \u1EE9ng to\xE0n c\u1EA7u \u0111\xF2i h\u1ECFi c\xE1c doanh nghi\u1EC7p ph\u1EA3i ch\u1EE7 \u0111\u1ED9ng \u0111a d\u1EA1ng h\xF3a ngu\u1ED3n cung \u1EE9ng.",
    hints: "global supply chain shifts = d\u1ECBch chuy\u1EC3n chu\u1ED7i cung \u1EE9ng to\xE0n c\u1EA7u; proactively diversify = ch\u1EE7 \u0111\u1ED9ng \u0111a d\u1EA1ng h\xF3a; sourcing = ngu\u1ED3n cung",
    answers: [
      "The shift in global supply chains requires enterprises to proactively diversify their sourcing.",
      "Global supply chain shifts require businesses to proactively diversify their suppliers.",
      "Shifts in global supply chains necessitate that companies proactively diversify their sourcing."
    ],
    created_date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
    category: "business",
    level: "C1"
  },
  {
    id: 413,
    vi: "Ch\xFAng t\xF4i cam k\u1EBFt tu\xE2n th\u1EE7 nghi\xEAm ng\u1EB7t c\xE1c ti\xEAu chu\u1EA9n qu\u1ED1c t\u1EBF v\u1EC1 b\u1EA3o m\u1EADt v\xE0 quy\u1EC1n ri\xEAng t\u01B0 d\u1EEF li\u1EC7u.",
    hints: "strictly adhere to = tu\xE2n th\u1EE7 nghi\xEAm ng\u1EB7t; international standards = ti\xEAu chu\u1EA9n qu\u1ED1c t\u1EBF; data privacy = quy\u1EC1n ri\xEAng t\u01B0 d\u1EEF li\u1EC7u",
    answers: [
      "We are committed to strictly adhering to international standards on data security and privacy.",
      "We commit to strict compliance with international standards regarding data security and privacy.",
      "Our team is committed to strictly complying with international data security and privacy standards."
    ],
    created_date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
    category: "it",
    level: "C1"
  },
  {
    id: 414,
    vi: "Kh\u1EA3 n\u0103ng \u1EE9ng bi\u1EBFn nhanh nh\u1EA1y v\xE0 qu\u1EA3n tr\u1ECB kh\u1EE7ng ho\u1EA3ng hi\u1EC7u qu\u1EA3 l\xE0 y\u1EBFu t\u1ED1 then ch\u1ED1t t\u1EA1o n\xEAn th\xE0nh c\xF4ng c\u1EE7a nh\xE0 l\xE3nh \u0111\u1EA1o.",
    hints: "agility = s\u1EF1 nhanh nh\u1EA1y \u1EE9ng bi\u1EBFn; crisis management = qu\u1EA3n tr\u1ECB kh\u1EE7ng ho\u1EA3ng; pivotal factor = y\u1EBFu t\u1ED1 then ch\u1ED1t",
    answers: [
      "Agility and effective crisis management are pivotal factors in a leader's success.",
      "Quick adaptability and effective crisis management are key factors in leadership success.",
      "Swift adaptability and sound crisis management represent pivotal elements of successful leadership."
    ],
    created_date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
    category: "business",
    level: "C1"
  },
  {
    id: 415,
    vi: "Ch\xFAng t\xF4i tr\xE2n tr\u1ECDng s\u1EF1 tin c\u1EADy l\xE2u d\xE0i v\xE0 mong mu\u1ED1n c\u1EE7ng c\u1ED1 m\u1ED1i quan h\u1EC7 h\u1EE3p t\xE1c chi\u1EBFn l\u01B0\u1EE3c gi\u1EEFa hai t\u1EADp \u0111o\xE0n.",
    hints: "longstanding trust = s\u1EF1 tin c\u1EADy l\xE2u d\xE0i; consolidate = c\u1EE7ng c\u1ED1; strategic partnership = quan h\u1EC7 \u0111\u1ED1i t\xE1c chi\u1EBFn l\u01B0\u1EE3c",
    answers: [
      "We appreciate your longstanding trust and look forward to consolidating the strategic partnership between our two corporations.",
      "We value this enduring trust and seek to reinforce the strategic partnership between our corporations.",
      "We cherish our long-term trust and aspire to solidify the strategic alliance between both corporations."
    ],
    created_date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
    category: "business",
    level: "C1"
  },
  {
    id: 416,
    vi: "H\u1ED9i \u0111\u1ED3ng qu\u1EA3n tr\u1ECB \u0111\xE3 ph\xEA duy\u1EC7t ng\xE2n s\xE1ch d\u1EF1 ph\xF2ng nh\u1EB1m gi\u1EA3m thi\u1EC3u r\u1EE7i ro bi\u1EBFn \u0111\u1ED9ng t\u1EF7 gi\xE1 h\u1ED1i \u0111o\xE1i.",
    hints: "board of directors = h\u1ED9i \u0111\u1ED3ng qu\u1EA3n tr\u1ECB; contingency budget = ng\xE2n s\xE1ch d\u1EF1 ph\xF2ng; mitigate exchange rate risks = gi\u1EA3m thi\u1EC3u r\u1EE7i ro t\u1EF7 gi\xE1",
    answers: [
      "The board of directors approved a contingency budget to mitigate foreign exchange rate risks.",
      "The board of directors has authorized a contingency fund to mitigate currency fluctuation risks.",
      "The management board approved a contingency budget aimed at mitigating foreign exchange risks."
    ],
    created_date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
    category: "business",
    level: "C1"
  },
  {
    id: 417,
    vi: "Vi\u1EC7c \xE1p d\u1EE5ng ki\u1EBFn tr\xFAc Microservices gi\xFAp t\u1ED1i \u01B0u h\xF3a kh\u1EA3 n\u0103ng m\u1EDF r\u1ED9ng h\u1EC7 th\u1ED1ng nh\u01B0ng c\u0169ng l\xE0m gia t\u0103ng \u0111\u1ED9 ph\u1EE9c t\u1EA1p trong \u0111i\u1EC1u ph\u1ED1i d\u1ECBch v\u1EE5.",
    hints: "microservices architecture = ki\u1EBFn tr\xFAc microservices; scalability = kh\u1EA3 n\u0103ng m\u1EDF r\u1ED9ng; service orchestration = \u0111i\u1EC1u ph\u1ED1i d\u1ECBch v\u1EE5",
    answers: [
      "Adopting a microservices architecture optimizes system scalability but increases service orchestration complexity.",
      "Implementing a microservices architecture helps optimize scalability but adds complexity to service orchestration.",
      "The adoption of microservices optimizes system scalability while increasing the complexity of service coordination."
    ],
    created_date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
    category: "it",
    level: "C1"
  },
  {
    id: 418,
    vi: "Ch\xFAng t\xF4i c\u1EA7n ti\u1EBFn h\xE0nh th\u1EA9m \u0111\u1ECBnh chuy\xEAn s\xE2u to\xE0n di\u1EC7n tr\u01B0\u1EDBc khi \u0111\u01B0a ra quy\u1EBFt \u0111\u1ECBnh \u0111\u1EA7u t\u01B0 cu\u1ED1i c\xF9ng.",
    hints: "conduct thorough due diligence = ti\u1EBFn h\xE0nh th\u1EA9m \u0111\u1ECBnh chuy\xEAn s\xE2u; final investment decision = quy\u1EBFt \u0111\u1ECBnh \u0111\u1EA7u t\u01B0 cu\u1ED1i c\xF9ng",
    answers: [
      "We need to conduct thorough due diligence before making the final investment decision.",
      "We must conduct comprehensive due diligence prior to reaching our final investment decision.",
      "Thorough due diligence must be conducted before we make the final investment decision."
    ],
    created_date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
    category: "business",
    level: "C1"
  },
  {
    id: 419,
    vi: "Khu ngh\u1EC9 d\u01B0\u1EE1ng cung c\u1EA5p d\u1ECBch v\u1EE5 qu\u1EA3n gia c\xE1 nh\xE2n cao c\u1EA5p nh\u1EB1m mang l\u1EA1i tr\u1EA3i nghi\u1EC7m \u0111\u1ED9c b\u1EA3n cho qu\xFD kh\xE1ch.",
    hints: "personalized butler service = d\u1ECBch v\u1EE5 qu\u1EA3n gia c\xE1 nh\xE2n; bespoke experience = tr\u1EA3i nghi\u1EC7m \u0111\u1ED9c b\u1EA3n; luxury resort = khu ngh\u1EC9 d\u01B0\u1EE1ng cao c\u1EA5p",
    answers: [
      "The resort offers premium personalized butler services to deliver a bespoke experience for our guests.",
      "Our resort provides high-end personal butler service to ensure a unique experience for every guest.",
      "The resort provides personalized butler service to deliver an exclusive experience for our guests."
    ],
    created_date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
    category: "hospitality",
    level: "C1"
  }
];

// server.ts
dotenv.config();
var app = express();
var PORT = 3e3;
app.use(express.json());
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  if (!req.url.startsWith("/api") && !req.url.startsWith("/index.html") && req.url !== "/") {
    req.url = "/api" + (req.url.startsWith("/") ? "" : "/") + req.url;
  }
  next();
});
var ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build"
    }
  }
});
var supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
var supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
var hasSupabaseAdmin = !!(supabaseUrl && supabaseServiceKey);
var supabaseAdmin = hasSupabaseAdmin ? createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
}) : null;
var memoryQuestionsStore = INITIAL_QUESTIONS.map((q, i) => ({
  id: i + 1,
  vi: q.vi,
  hints: q.hints,
  answers: q.answers,
  created_date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0]
}));
var SETTINGS_FILE = path.join(process.cwd(), "app-settings.json");
var appSettings = {
  appName: "Dịch Mỗi Ngày",
  appSubtitle: "Dịch câu mỗi ngày kèm từ vựng gợi ý",
  appIcon: "🎯",
  appIconType: "emoji",
  contactEmail: "hungpv2172002@gmail.com",
  contactFacebook: "https://facebook.com",
  contactTiktok: "https://tiktok.com"
};
try {
  if (fs.existsSync(SETTINGS_FILE)) {
    const saved = JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf-8"));
    if (saved && typeof saved === "object") {
      appSettings = { ...appSettings, ...saved };
    }
  } else if (fs.existsSync("/tmp/app-settings.json")) {
    const savedTmp = JSON.parse(fs.readFileSync("/tmp/app-settings.json", "utf-8"));
    if (savedTmp && typeof savedTmp === "object") {
      appSettings = { ...appSettings, ...savedTmp };
    }
  }
} catch (e) {
  console.warn("Không thể đọc file app-settings.json:", e);
}
function getDailyRotatedQuestions(allQuestions, dateStr) {
  if (!allQuestions || allQuestions.length === 0) return [];
  const today = dateStr || (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  let seed = 0;
  for (let i = 0; i < today.length; i++) {
    seed = (seed << 5) - seed + today.charCodeAt(i);
    seed |= 0;
  }
  seed = Math.abs(seed) || 12345;
  const random = () => {
    let t = seed += 1831565813;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
  const todayQuestions = allQuestions.filter((q) => q.created_date === today);
  const otherQuestions = allQuestions.filter((q) => q.created_date !== today);
  const shuffledToday = [...todayQuestions];
  for (let i = shuffledToday.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffledToday[i], shuffledToday[j]] = [shuffledToday[j], shuffledToday[i]];
  }
  const shuffledOthers = [...otherQuestions];
  for (let i = shuffledOthers.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffledOthers[i], shuffledOthers[j]] = [shuffledOthers[j], shuffledOthers[i]];
  }
  return [...shuffledToday, ...shuffledOthers];
}
app.get(["/api/health", "/health"], (req, res) => {
  res.json({
    status: "ok",
    hasGeminiKey: !!process.env.GEMINI_API_KEY,
    hasSupabaseAdmin
  });
});
app.all(["/api/cron/generate", "/cron/generate"], async (req, res) => {
  try {
    const expectedSecret = process.env.CRON_SECRET || "my_super_secret_cron_token_12345";
    const allowedSecrets = /* @__PURE__ */ new Set([
      expectedSecret,
      "my_super_secret_cron_token_12345"
    ]);
    const authHeader = req.headers.authorization || req.headers["x-cron-secret"];
    const queryKey = req.query.key || req.query.secret || req.query.token;
    const bodyKey = req.body && typeof req.body === "object" ? req.body.secret || req.body.key : void 0;
    const token = authHeader?.startsWith("Bearer ") ? authHeader.substring(7).trim() : authHeader || queryKey || bodyKey;
    if (!token || !allowedSecrets.has(token)) {
      if (req.headers.accept?.includes("text/html")) {
        return res.status(401).send(`
          <!DOCTYPE html>
          <html lang="vi">
          <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>Cron API Authentication</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; color: #1e293b; padding: 40px 20px; display: flex; justify-content: center; }
              .card { background: white; border-radius: 20px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05); padding: 32px; max-width: 540px; width: 100%; border: 1px solid #e2e8f0; }
              h1 { font-size: 20px; color: #0f172a; margin-top: 0; }
              p { font-size: 14px; line-height: 1.6; color: #64748b; }
              code { background: #f1f5f9; padding: 3px 6px; border-radius: 6px; font-family: monospace; color: #4f46e5; font-size: 13px; word-break: break-all; }
              .btn { display: inline-block; background: #4f46e5; color: white; padding: 12px 20px; border-radius: 12px; font-weight: bold; text-decoration: none; font-size: 14px; margin-top: 16px; }
              .btn:hover { background: #4338ca; }
              .tip { background: #fef3c7; border: 1px solid #fde68a; padding: 12px 16px; border-radius: 12px; color: #92400e; font-size: 13px; margin: 16px 0; }
            </style>
          </head>
          <body>
            <div class="card">
              <h1>\u{1F511} Y\xEAu c\u1EA7u Secret Key \u0111\u1EC3 k\xEDch ho\u1EA1t Cron API</h1>
              <p>Endpoint n\xE0y \u0111\u01B0\u1EE3c b\u1EA3o m\u1EADt \u0111\u1EC3 tr\xE1nh vi\u1EC7c b\u1ECB g\u1ECDi t\u1EF1 \u0111\u1ED9ng tr\xE1i ph\xE9p g\xE2y t\u1ED1n chi ph\xED API.</p>
              
              <div class="tip">
                <strong>\u{1F4A1} C\xE1ch ch\u1EA1y nhanh:</strong> B\u1EA1n c\xF3 th\u1EC3 th\xEAm <code>?key=my_super_secret_cron_token_12345</code> v\xE0o cu\u1ED1i URL.
              </div>

              <p>Ho\u1EB7c b\u1EA5m v\xE0o n\xFAt b\xEAn d\u01B0\u1EDBi \u0111\u1EC3 ch\u1EA1y tr\u1EF1c ti\u1EBFp ngay:</p>
              <a class="btn" href="/api/cron/generate?key=my_super_secret_cron_token_12345">
                \u26A1 K\xEDch ho\u1EA1t sinh c\xE2u v\u1EDBi Secret Key m\u1EB7c \u0111\u1ECBnh
              </a>
              
              <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8;">
                Headers: <code>Authorization: Bearer my_super_secret_cron_token_12345</code>
              </div>
            </div>
          </body>
          </html>
        `);
      }
      return res.status(401).json({
        error: "Unauthorized: Secret key kh\xF4ng h\u1EE3p l\u1EC7 ho\u1EB7c thi\u1EBFu.",
        message: "Vui l\xF2ng cung c\u1EA5p Secret Key qua query parameter ?key=... ho\u1EB7c header Authorization.",
        quick_run_url: "/api/cron/generate?key=my_super_secret_cron_token_12345",
        how_to_use: {
          browser_or_get: "/api/cron/generate?key=my_super_secret_cron_token_12345",
          header: "Authorization: Bearer my_super_secret_cron_token_12345"
        }
      });
    }
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: "Ch\u01B0a c\u1EA5u h\xECnh GEMINI_API_KEY trong h\u1EC7 th\u1ED1ng."
      });
    }
    const requestedCategory = (req.query.category || req.body?.category)?.toLowerCase() || "general";
    let industryInstruction = "giao ti\u1EBFp \u0111\u1EDDi th\u01B0\u1EDDng v\xE0 x\xE3 h\u1ED9i th\u1EF1c t\u1EBF";
    if (requestedCategory === "it") {
      industryInstruction = "chuy\xEAn ng\xE0nh C\xF4ng Ngh\u1EC7 Th\xF4ng Tin & L\u1EADp Tr\xECnh (IT, Tech, Scrum/Agile, review code, bug report, deploy server, API, database queries, sprint)";
    } else if (requestedCategory === "business") {
      industryInstruction = "chuy\xEAn ng\xE0nh Kinh Doanh, B\xE1n H\xE0ng & Marketing (Business, Sales, \u0111\xE0m ph\xE1n h\u1EE3p \u0111\u1ED3ng, pitching, kh\xE1ch h\xE0ng doanh nghi\u1EC7p, b\xE1o c\xE1o doanh thu, chi\u1EBFt kh\u1EA5u)";
    } else if (requestedCategory === "hospitality") {
      industryInstruction = "chuy\xEAn ng\xE0nh Kh\xE1ch S\u1EA1n, Nh\xE0 H\xE0ng & Du L\u1ECBch (Hospitality & Tourism, l\u1EC5 t\xE2n check-in, ti\u1EBFp \u0111\xF3n kh\xE1ch n\u01B0\u1EDBc ngo\xE0i, x\u1EED l\xFD ph\xE0n n\xE0n, ph\u1EE5c v\u1EE5 buffet)";
    }
    const prompt = `B\u1EA1n l\xE0 m\u1ED9t chuy\xEAn gia ng\xF4n ng\u1EEF ti\u1EBFng Anh v\xE0 ti\u1EBFng Vi\u1EC7t.
H\xE3y t\u1EA1o \u0111\xFAng 10 c\xE2u luy\u1EC7n d\u1ECBch chuy\xEAn s\xE2u thu\u1ED9c ch\u1EE7 \u0111\u1EC1: ${industryInstruction} t\u1EEB ti\u1EBFng Vi\u1EC7t sang ti\u1EBFng Anh c\u1EF1c k\u1EF3 thi\u1EBFt th\u1EF1c, t\u1EF1 nhi\xEAn v\xE0 h\u1EEFu \xEDch cho ng\u01B0\u1EDDi h\u1ECDc.
M\u1ED7i c\xE2u b\xE0i t\u1EADp g\u1ED3m:
1. "vi": C\xE2u ti\u1EBFng Vi\u1EC7t t\u1EF1 nhi\xEAn trong b\u1ED1i c\u1EA3nh th\u1EF1c t\u1EBF n\xEAu tr\xEAn.
2. "hints": G\u1EE3i \xFD 2-3 t\u1EEB v\u1EF1ng ho\u1EB7c c\u1EE5m t\u1EEB then ch\u1ED1t (v\xED d\u1EE5: "pull request = y\xEAu c\u1EA7u pull; review code = xem x\xE9t m\xE3 ngu\u1ED3n").
3. "answers": M\u1EA3ng g\u1ED3m \xEDt nh\u1EA5t 2 \u0111\u1EBFn 4 c\xE2u ti\u1EBFng Anh t\u01B0\u01A1ng \u0111\u01B0\u01A1ng chu\u1EA9n x\xE1c v\xE0 \u0111\u01B0\u1EE3c ch\u1EA5p nh\u1EADn (bao g\u1ED3m c\u1EA3 c\xE1ch n\xF3i r\xFAt g\u1ECDn nh\u01B0 "don't" v\xE0 \u0111\u1EA7y \u0111\u1EE7 "do not").`;
    const CANDIDATE_MODELS = [
      "gemini-3.1-flash-lite",
      "gemini-3.8-flash",
      "gemini-3.6-flash",
      "gemini-flash-latest",
      "gemini-3.1-pro-preview"
    ];
    let questionsData = [];
    let successfulModel = "";
    if (process.env.GEMINI_API_KEY) {
      for (const modelCandidate of CANDIDATE_MODELS) {
        try {
          console.log(`\u0110ang g\u1ECDi Gemini model: ${modelCandidate}...`);
          const response = await ai.models.generateContent({
            model: modelCandidate,
            contents: prompt,
            config: {
              temperature: 0.7,
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.ARRAY,
                description: "Danh s\xE1ch 10 c\xE2u d\u1ECBch giao ti\u1EBFp",
                items: {
                  type: Type.OBJECT,
                  properties: {
                    vi: { type: Type.STRING },
                    hints: { type: Type.STRING },
                    answers: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING }
                    }
                  },
                  required: ["vi", "hints", "answers"]
                }
              }
            }
          });
          const textOutput = response.text?.trim() || "[]";
          const parsed = JSON.parse(textOutput);
          if (Array.isArray(parsed) && parsed.length > 0) {
            questionsData = parsed;
            successfulModel = modelCandidate;
            console.log(`Sinh c\xE2u th\xE0nh c\xF4ng v\u1EDBi model ${modelCandidate}!`);
            break;
          }
        } catch {
          console.log(`[AI Load Balancer] Model ${modelCandidate} \u0111ang b\u1EADn, chuy\u1EC3n sang model k\u1EBF ti\u1EBFp...`);
        }
      }
    }
    let isCuratedFallback = false;
    if (questionsData.length === 0) {
      console.log("[AI Fallback] K\xEDch ho\u1EA1t ng\xE2n h\xE0ng c\xE2u h\u1ECFi giao ti\u1EBFp chu\u1EA9n.");
      isCuratedFallback = true;
      const matchingPool = INITIAL_QUESTIONS.filter(
        (q) => (q.category || "general") === requestedCategory
      );
      const poolToUse = matchingPool.length > 0 ? matchingPool : INITIAL_QUESTIONS;
      const shuffled = [...poolToUse].sort(() => Math.random() - 0.5);
      questionsData = shuffled.slice(0, 10).map((item) => ({
        vi: item.vi,
        hints: item.hints,
        answers: item.answers,
        category: requestedCategory
      }));
    }
    const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const records = questionsData.map((q) => ({
      vi: q.vi,
      hints: q.hints,
      answers: Array.isArray(q.answers) ? q.answers : [q.answers],
      created_date: today,
      category: requestedCategory
    }));
    const newWithLocalIds = records.map((r, idx) => ({
      id: Date.now() + idx,
      ...r
    }));
    memoryQuestionsStore = [...newWithLocalIds, ...memoryQuestionsStore];
    let insertedData = null;
    let supabaseSaveSuccess = false;
    let supabaseWarning = null;
    let fixSql = null;
    if (supabaseAdmin) {
      try {
        const { data, error } = await supabaseAdmin.from("questions").insert(records).select();
        if (error) {
          console.warn("L\u01B0u v\xE0o Supabase th\u1EA5t b\u1EA1i:", error.message);
          const isTableMissing = error.message?.includes("schema cache") || error.message?.includes("does not exist") || error.code === "PGRST204";
          const isPermissionDenied = error.message?.includes("permission denied") || error.code === "42501";
          if (isTableMissing) {
            supabaseWarning = "table_missing";
          } else if (isPermissionDenied) {
            supabaseWarning = "permission_denied";
            fixSql = "GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;\nGRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;\nGRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;";
          } else {
            supabaseWarning = error.message;
          }
        } else if (data) {
          supabaseSaveSuccess = true;
          insertedData = data;
        }
      } catch (dbEx) {
        console.warn("Ngo\u1EA1i l\u1EC7 khi g\u1ECDi Supabase:", dbEx.message);
        supabaseWarning = dbEx.message;
      }
    }
    return res.json({
      success: true,
      message: isCuratedFallback ? `\u0110\xE3 n\u1EA1p ${records.length} c\xE2u h\u1ECFi giao ti\u1EBFp chu\u1EA9n ch\u1ECDn l\u1ECDc.` : `\u0110\xE3 sinh th\xE0nh c\xF4ng ${records.length} c\xE2u h\u1ECFi m\u1EDBi b\u1EB1ng Gemini AI (${successfulModel})!`,
      count: records.length,
      modelUsed: successfulModel || "curated_database",
      isCuratedFallback,
      insertedToSupabase: supabaseSaveSuccess,
      supabaseWarning,
      fixSql,
      data: insertedData || newWithLocalIds
    });
  } catch (err) {
    console.error("L\u1ED7i khi sinh c\xE2u h\u1ECFi:", err);
    return res.status(500).json({
      error: err.message || "L\u1ED7i server khi sinh c\xE2u h\u1ECFi"
    });
  }
});
app.get(["/api/questions", "/questions"], async (req, res) => {
  const queryDate = req.query.date || (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  const mode = req.query.mode || "daily";
  let rawQuestions = memoryQuestionsStore;
  let source = "memory";
  try {
    if (supabaseAdmin) {
      const { data, error } = await supabaseAdmin.from("questions").select("*").order("id", { ascending: true });
      if (!error && data && data.length > 0) {
        rawQuestions = data;
        source = "supabase";
      }
    }
  } catch (err) {
    console.warn("L\u1ED7i \u0111\u1ECDc c\xE2u h\u1ECFi t\u1EEB Supabase, chuy\u1EC3n sang b\u1ED9 nh\u1EDB \u0111\u1EC7m:", err.message);
  }
  const existingIds = new Set(rawQuestions.map((q) => q.id));
  const missingQuestions = INITIAL_QUESTIONS.filter((q) => !existingIds.has(q.id));
  if (missingQuestions.length > 0) {
    rawQuestions = [...rawQuestions, ...missingQuestions];
  }
  const category = req.query.category?.toLowerCase();
  let pool = rawQuestions;
  if (category && category !== "all") {
    const matched = rawQuestions.filter((q) => (q.category || "general") === category);
    if (matched.length > 0) {
      pool = matched;
    }
  }
  const finalQuestions = mode === "raw" ? pool : getDailyRotatedQuestions(pool, queryDate);
  return res.json({
    success: true,
    questions: finalQuestions,
    total: finalQuestions.length,
    date: queryDate,
    category: category || "all",
    isRotatedDaily: mode !== "raw",
    source
  });
});
app.get(["/api/settings", "/settings"], async (req, res) => {
  if (supabaseAdmin) {
    try {
      const { data: dbData } = await supabaseAdmin
        .from("app_settings")
        .select("value")
        .eq("id", "default")
        .maybeSingle();
      if (dbData?.value && typeof dbData.value === "object") {
        appSettings = { ...appSettings, ...dbData.value };
      }
    } catch (e) {
      // Tiếp tục nếu bảng chưa tồn tại
    }
  }

  return res.json({
    success: true,
    settings: appSettings
  });
});
app.post(["/api/settings", "/settings"], async (req, res) => {
  try {
    const {
      appName,
      appSubtitle,
      appIcon,
      appIconType,
      contactEmail,
      contactFacebook,
      contactTiktok
    } = req.body || {};
    if (appName && typeof appName === "string") {
      appSettings.appName = appName.trim();
    }
    if (typeof appSubtitle === "string") {
      appSettings.appSubtitle = appSubtitle.trim();
    }
    if (appIcon && typeof appIcon === "string") {
      appSettings.appIcon = appIcon.trim();
    }
    if (appIconType === "lucide" || appIconType === "emoji") {
      appSettings.appIconType = appIconType;
    }
    if (typeof contactEmail === "string") {
      appSettings.contactEmail = contactEmail.trim();
    }
    if (typeof contactFacebook === "string") {
      appSettings.contactFacebook = contactFacebook.trim();
    }
    if (typeof contactTiktok === "string") {
      appSettings.contactTiktok = contactTiktok.trim();
    }
    try {
      fs.writeFileSync(SETTINGS_FILE, JSON.stringify(appSettings, null, 2), "utf-8");
    } catch (e) {
      try {
        fs.writeFileSync("/tmp/app-settings.json", JSON.stringify(appSettings, null, 2), "utf-8");
      } catch (e2) {}
    }

    if (supabaseAdmin) {
      try {
        await supabaseAdmin.from("app_settings").upsert({
          id: "default",
          value: appSettings,
          updated_at: (/* @__PURE__ */ new Date()).toISOString()
        });
      } catch (dbErr) {
        console.warn("Lỗi lưu app_settings vào Supabase:", dbErr);
      }
    }

    return res.json({
      success: true,
      message: "Đã lưu thay đổi cài đặt ứng dụng thành công!",
      settings: appSettings
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});
app.get("/api/schema", (req, res) => {
  try {
    const filePath = path.join(process.cwd(), "supabase-schema.sql");
    if (fs.existsSync(filePath)) {
      const sqlContent = fs.readFileSync(filePath, "utf-8");
      return res.json({ success: true, sql: sqlContent });
    }
    return res.status(404).json({ success: false, error: "Kh\xF4ng t\xECm th\u1EA5y file supabase-schema.sql" });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});
app.get("/supabase-schema.sql", (req, res) => {
  try {
    const filePath = path.join(process.cwd(), "supabase-schema.sql");
    if (fs.existsSync(filePath)) {
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      return res.sendFile(filePath);
    }
    return res.status(404).send("Kh\xF4ng t\xECm th\u1EA5y file supabase-schema.sql");
  } catch (err) {
    return res.status(500).send("L\u1ED7i: " + err.message);
  }
});
app.get("/download-schema", (req, res) => {
  try {
    const filePath = path.join(process.cwd(), "supabase-schema.sql");
    if (fs.existsSync(filePath)) {
      return res.download(filePath, "supabase-schema.sql");
    }
    return res.status(404).send("Kh\xF4ng t\xECm th\u1EA5y file supabase-schema.sql");
  } catch (err) {
    return res.status(500).send("L\u1ED7i: " + err.message);
  }
});
var otpMemoryStore = /* @__PURE__ */ new Map();
function createMailTransporter() {
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const user = (process.env.SMTP_USER || process.env.GMAIL_USER || "").trim();
  const rawPass = process.env.SMTP_PASS || process.env.GMAIL_PASS || process.env.GMAIL_APP_PASSWORD || "";
  const pass = rawPass.replace(/\s+/g, "").trim();
  if (!user || !pass) {
    return null;
  }
  if (host.includes("gmail.com") || user.includes("@gmail.com")) {
    return nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass }
    });
  }
  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass }
  });
}
app.post(["/api/auth/send-otp", "/auth/send-otp"], async (req, res) => {
  try {
    const { email, fullName, type = "register" } = req.body || {};
    const cleanEmail = (email || "").trim().toLowerCase();
    const otpType = type === "forgot" ? "forgot" : "register";
    if (!cleanEmail || !cleanEmail.includes("@")) {
      return res.status(400).json({ success: false, error: "\u0110\u1ECBa ch\u1EC9 email kh\xF4ng h\u1EE3p l\u1EC7." });
    }
    const otpNumber = 1e5 + crypto.randomInt(0, 9e5);
    const otp = otpNumber.toString();
    otpMemoryStore.set(cleanEmail, {
      otp,
      expiresAt: Date.now() + 10 * 60 * 1e3,
      type: otpType
    });
    const transporter = createMailTransporter();
    let emailSent = false;
    let mailError = null;
    if (transporter) {
      try {
        const fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER || `Daily Translation <noreply@dailytranslation.app>`;
        const isForgot = otpType === "forgot";
        const emailSubject = isForgot ? `[Daily Translation] M\xE3 kh\xF4i ph\u1EE5c m\u1EADt kh\u1EA9u: ${otp}` : `[Daily Translation] M\xE3 x\xE1c th\u1EF1c \u0111\u0103ng k\xFD t\xE0i kho\u1EA3n: ${otp}`;
        const greetingName = fullName || cleanEmail.split("@")[0];
        const actionText = isForgot ? "B\u1EA1n (ho\u1EB7c ai \u0111\xF3) v\u1EEBa y\xEAu c\u1EA7u <strong>kh\xF4i ph\u1EE5c m\u1EADt kh\u1EA9u</strong> t\xE0i kho\u1EA3n h\u1ECDc t\u1EADp tr\xEAn <strong>Daily Translation</strong>." : "B\u1EA1n \u0111ang th\u1EF1c hi\u1EC7n <strong>\u0111\u0103ng k\xFD t\xE0i kho\u1EA3n h\u1ECDc t\u1EADp</strong> tr\xEAn <strong>Daily Translation</strong>.";
        const reminderText = isForgot ? "N\u1EBFu b\u1EA1n kh\xF4ng y\xEAu c\u1EA7u \u0111\u1EB7t l\u1EA1i m\u1EADt kh\u1EA9u, vui l\xF2ng b\u1ECF qua email n\xE0y. M\u1EADt kh\u1EA9u hi\u1EC7n t\u1EA1i c\u1EE7a b\u1EA1n v\u1EABn \u0111\u01B0\u1EE3c gi\u1EEF an to\xE0n." : "V\xEC l\xFD do an to\xE0n b\u1EA3o m\u1EADt, tuy\u1EC7t \u0111\u1ED1i kh\xF4ng chia s\u1EBB m\xE3 n\xE0y cho ng\u01B0\u1EDDi kh\xE1c.";
        await transporter.sendMail({
          from: fromAddress,
          to: cleanEmail,
          subject: emailSubject,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 20px;">
              <div style="text-align: center; margin-bottom: 24px;">
                <h1 style="color: #4f46e5; margin: 0; font-size: 24px; font-weight: 800;">Daily Translation</h1>
                <p style="color: #64748b; font-size: 13px; margin-top: 4px;">Luy\u1EC7n d\u1ECBch Vi\u1EC7t \u2794 Anh m\u1ED7i ng\xE0y</p>
              </div>
              <p style="color: #334155; font-size: 15px; line-height: 1.6;">
                Xin ch\xE0o <strong>${greetingName}</strong>,
              </p>
              <p style="color: #475569; font-size: 14px; line-height: 1.6;">
                ${actionText} D\u01B0\u1EDBi \u0111\xE2y l\xE0 m\xE3 x\xE1c th\u1EF1c 6 ch\u1EEF s\u1ED1 c\u1EE7a b\u1EA1n:
              </p>
              <div style="background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 16px; padding: 24px; text-align: center; margin: 24px 0;">
                <span style="font-size: 38px; font-weight: 900; letter-spacing: 8px; color: #1e1b4b; font-family: monospace;">${otp}</span>
              </div>
              <p style="color: #64748b; font-size: 13px; line-height: 1.6;">
                \u23F0 M\xE3 n\xE0y c\xF3 hi\u1EC7u l\u1EF1c trong v\xF2ng <strong>10 ph\xFAt</strong>. ${reminderText}
              </p>
              <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #f1f5f9; text-align: center; font-size: 12px; color: #94a3b8;">
                Daily Translation App \u2022 H\u1EC7 th\u1ED1ng h\u1ECDc ti\u1EBFng Anh giao ti\u1EBFp th\xF4ng minh
              </div>
            </div>
          `
        });
        emailSent = true;
        console.log(`[EMAIL OTP] \u0110\xE3 g\u1EEDi m\xE3 x\xE1c th\u1EF1c (${otpType}) th\xE0nh c\xF4ng t\u1EDBi email: ${cleanEmail}`);
      } catch (err) {
        console.error("L\u1ED7i g\u1EEDi email qua SMTP:", err.message);
        mailError = err.message;
      }
    } else {
      console.log(`[EMAIL OTP (Ch\u01B0a c\u1EA5u h\xECnh SMTP)] T\u1EA1o m\xE3 x\xE1c th\u1EF1c cho ${cleanEmail}: ${otp}`);
    }
    if (!transporter) {
      return res.status(400).json({
        success: false,
        emailSent: false,
        hasSmtpConfigured: false,
        error: "M\xE1y ch\u1EE7 ch\u01B0a c\u1EA5u h\xECnh d\u1ECBch v\u1EE5 g\u1EEDi Email (SMTP_USER / SMTP_PASS). Vui l\xF2ng c\u1EA5u h\xECnh t\xE0i kho\u1EA3n g\u1EEDi email tr\xEAn Vercel ho\u1EB7c bi\u1EBFn m\xF4i tr\u01B0\u1EDDng."
      });
    }
    if (!emailSent && mailError) {
      return res.status(500).json({
        success: false,
        emailSent: false,
        hasSmtpConfigured: true,
        error: `Kh\xF4ng th\u1EC3 g\u1EEDi email x\xE1c th\u1EF1c: ${mailError}. Vui l\xF2ng ki\u1EC3m tra l\u1EA1i c\u1EA5u h\xECnh t\xE0i kho\u1EA3n g\u1EEDi th\u01B0.`
      });
    }
    return res.json({
      success: true,
      emailSent: true,
      hasSmtpConfigured: true,
      message: "M\xE3 x\xE1c th\u1EF1c 6 ch\u1EEF s\u1ED1 \u0111\xE3 \u0111\u01B0\u1EE3c g\u1EEDi t\u1EDBi email c\u1EE7a b\u1EA1n."
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});
app.post(["/api/auth/verify-otp", "/auth/verify-otp"], (req, res) => {
  try {
    const { email, otp } = req.body || {};
    const cleanEmail = (email || "").trim().toLowerCase();
    const cleanOtp = (otp || "").trim();
    if (!cleanEmail || !cleanOtp) {
      return res.status(400).json({ success: false, error: "Thi\u1EBFu email ho\u1EB7c m\xE3 x\xE1c th\u1EF1c." });
    }
    const record = otpMemoryStore.get(cleanEmail);
    if (!record) {
      return res.status(400).json({
        success: false,
        error: 'M\xE3 x\xE1c th\u1EF1c kh\xF4ng t\u1ED3n t\u1EA1i ho\u1EB7c \u0111\xE3 h\u1EBFt h\u1EA1n. Vui l\xF2ng b\u1EA5m "G\u1EEDi l\u1EA1i m\xE3".'
      });
    }
    if (Date.now() > record.expiresAt) {
      otpMemoryStore.delete(cleanEmail);
      return res.status(400).json({
        success: false,
        error: "M\xE3 x\xE1c th\u1EF1c \u0111\xE3 h\u1EBFt h\u1EA1n hi\u1EC7u l\u1EF1c (qu\xE1 10 ph\xFAt). Vui l\xF2ng y\xEAu c\u1EA7u m\xE3 m\u1EDBi."
      });
    }
    if (record.otp !== cleanOtp) {
      return res.status(400).json({
        success: false,
        error: "M\xE3 x\xE1c th\u1EF1c kh\xF4ng ch\xEDnh x\xE1c. Vui l\xF2ng ki\u1EC3m tra l\u1EA1i h\xF2m th\u01B0 email c\u1EE7a b\u1EA1n."
      });
    }
    otpMemoryStore.delete(cleanEmail);
    return res.json({
      success: true,
      verified: true,
      message: "X\xE1c th\u1EF1c m\xE3 email th\xE0nh c\xF4ng!"
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});
app.post(["/api/auth/reset-password", "/auth/reset-password"], async (req, res) => {
  try {
    const { email, otp, rawPassword } = req.body || {};
    const cleanEmail = (email || "").trim().toLowerCase();
    const cleanOtp = (otp || "").trim();
    if (!cleanEmail || !cleanOtp || !rawPassword) {
      return res.status(400).json({
        success: false,
        error: "Vui l\xF2ng cung c\u1EA5p \u0111\u1EA7y \u0111\u1EE7 email, m\xE3 x\xE1c th\u1EF1c v\xE0 m\u1EADt kh\u1EA9u m\u1EDBi."
      });
    }
    if (rawPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: "M\u1EADt kh\u1EA9u m\u1EDBi ph\u1EA3i c\xF3 \xEDt nh\u1EA5t 6 k\xFD t\u1EF1."
      });
    }
    const record = otpMemoryStore.get(cleanEmail);
    if (!record) {
      return res.status(400).json({
        success: false,
        error: "M\xE3 x\xE1c th\u1EF1c kh\xF4ng t\u1ED3n t\u1EA1i ho\u1EB7c \u0111\xE3 h\u1EBFt h\u1EA1n. Vui l\xF2ng y\xEAu c\u1EA7u m\xE3 kh\xF4i ph\u1EE5c m\u1EDBi."
      });
    }
    if (Date.now() > record.expiresAt) {
      otpMemoryStore.delete(cleanEmail);
      return res.status(400).json({
        success: false,
        error: "M\xE3 x\xE1c th\u1EF1c \u0111\xE3 h\u1EBFt h\u1EA1n (qu\xE1 10 ph\xFAt). Vui l\xF2ng y\xEAu c\u1EA7u g\u1EEDi l\u1EA1i m\xE3."
      });
    }
    if (record.otp !== cleanOtp) {
      return res.status(400).json({
        success: false,
        error: "M\xE3 x\xE1c th\u1EF1c kh\xF4ng ch\xEDnh x\xE1c. Vui l\xF2ng ki\u1EC3m tra l\u1EA1i h\xF2m th\u01B0 email c\u1EE7a b\u1EA1n."
      });
    }
    if (supabaseAdmin) {
      try {
        const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
        const targetUser = listData?.users?.find((u) => u.email === cleanEmail);
        if (targetUser) {
          await supabaseAdmin.auth.admin.updateUserById(targetUser.id, {
            password: rawPassword
          });
          console.log(`[Supabase Auth] \u0110\xE3 c\u1EADp nh\u1EADt m\u1EADt kh\u1EA9u m\u1EDBi cho ${cleanEmail}`);
        }
      } catch (supaErr) {
        console.warn("L\u1ED7i c\u1EADp nh\u1EADt m\u1EADt kh\u1EA9u tr\xEAn Supabase:", supaErr.message);
      }
    }
    otpMemoryStore.delete(cleanEmail);
    return res.json({
      success: true,
      message: "\u0110\u1EB7t l\u1EA1i m\u1EADt kh\u1EA9u th\xE0nh c\xF4ng! B\u1EA1n c\xF3 th\u1EC3 \u0111\u0103ng nh\u1EADp b\u1EB1ng m\u1EADt kh\u1EA9u m\u1EDBi."
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});
async function start() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server \u0111ang ch\u1EA1y tr\xEAn http://localhost:${PORT}`);
  });
}
if (!process.env.VERCEL) {
  start();
}
var server_default = app;
export {
  server_default as default
};
