// server.ts
import express from "express";
import http from "http";
import { WebSocketServer, WebSocket } from "ws";
import path from "path";
import fs from "fs";
import crypto2 from "crypto";
import nodemailer from "nodemailer";
import { GoogleGenAI, Type } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

// src/data/adultQuestionBank.ts
var today = () => (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
function buildLevel(level, startId, frames) {
  return frames.flatMap(
    (frame, frameIndex) => frame.items.map((item, itemIndex) => ({
      id: startId + frameIndex * 10 + itemIndex,
      vi: frame.vi.replace("{item}", item.vi),
      hints: `${frame.hint}; ${item.en} = ${item.vi}`,
      answers: [frame.en.replace("{item}", item.en)],
      created_date: today(),
      category: "general",
      level
    }))
  );
}
var A1_ITEMS = [
  ["t\xE1o", "apples"],
  ["chu\u1ED1i", "bananas"],
  ["b\xE1nh m\xEC", "bread"],
  ["c\u01A1m", "rice"],
  ["tr\u1EE9ng", "eggs"],
  ["th\u1ECBt g\xE0", "chicken"],
  ["cam", "oranges"],
  ["m\xEC", "noodles"],
  ["s\u1EEFa chua", "yogurt"],
  ["b\xE1nh quy", "cookies"]
].map(([vi, en]) => ({ vi, en }));
var A1_OBJECTS = [
  ["m\u1ED9t chi\u1EBFc b\xFAt", "a pen"],
  ["m\u1ED9t quy\u1EC3n v\u1EDF", "a notebook"],
  ["m\u1ED9t chi\u1EBFc \xF4", "an umbrella"],
  ["m\u1ED9t chi\u1EBFc \u0111\u1ED3ng h\u1ED3", "a watch"],
  ["m\u1ED9t c\xE1i t\xFAi", "a bag"],
  ["m\u1ED9t chi\u1EBFc xe \u0111\u1EA1p", "a bicycle"],
  ["m\u1ED9t chi\u1EBFc \xE1o kho\xE1c", "a jacket"],
  ["m\u1ED9t chi\u1EBFc \u0111i\u1EC7n tho\u1EA1i", "a phone"],
  ["m\u1ED9t chi\u1EBFc ch\xECa kh\xF3a", "a key"],
  ["m\u1ED9t chi\u1EBFc m\u0169", "a hat"]
].map(([vi, en]) => ({ vi, en }));
var A1_PLACES = [
  ["tr\u01B0\u1EDDng h\u1ECDc", "school"],
  ["si\xEAu th\u1ECB", "the supermarket"],
  ["c\xF4ng vi\xEAn", "the park"],
  ["th\u01B0 vi\u1EC7n", "the library"],
  ["b\u01B0u \u0111i\u1EC7n", "the post office"],
  ["nh\xE0 ga", "the station"],
  ["b\u1EC7nh vi\u1EC7n", "the hospital"],
  ["b\u1EA3o t\xE0ng", "the museum"],
  ["b\xE3i bi\u1EC3n", "the beach"],
  ["nh\xE0 h\xE0ng", "the restaurant"]
].map(([vi, en]) => ({ vi, en }));
var A1_DRINKS = [
  ["n\u01B0\u1EDBc l\u1ECDc", "water"],
  ["tr\xE0", "tea"],
  ["c\xE0 ph\xEA", "coffee"],
  ["n\u01B0\u1EDBc cam", "orange juice"],
  ["s\u1EEFa", "milk"],
  ["n\u01B0\u1EDBc chanh", "lemonade"],
  ["n\u01B0\u1EDBc d\u1EEBa", "coconut water"],
  ["s\xF4 c\xF4 la n\xF3ng", "hot chocolate"],
  ["sinh t\u1ED1", "a smoothie"],
  ["n\u01B0\u1EDBc t\xE1o", "apple juice"]
].map(([vi, en]) => ({ vi, en }));
var A1_CLOTHES = [
  ["\xE1o len", "a sweater"],
  ["qu\u1EA7n d\xE0i", "trousers"],
  ["\u0111\xF4i gi\xE0y", "shoes"],
  ["\xE1o m\u01B0a", "a raincoat"],
  ["kh\u0103n qu\xE0ng", "a scarf"],
  ["g\u0103ng tay", "gloves"],
  ["v\xE1y", "a dress"],
  ["\xE1o s\u01A1 mi", "a shirt"],
  ["qu\u1EA7n \u0111\xF9i", "shorts"],
  ["\u0111\xF4i t\u1EA5t", "socks"]
].map(([vi, en]) => ({ vi, en }));
var A1_ANIMALS = [
  ["m\u1ED9t con m\xE8o", "a cat"],
  ["m\u1ED9t con ch\xF3", "a dog"],
  ["m\u1ED9t con chim", "a bird"],
  ["m\u1ED9t con c\xE1", "a fish"],
  ["m\u1ED9t con ng\u1EF1a", "a horse"],
  ["m\u1ED9t con th\u1ECF", "a rabbit"],
  ["m\u1ED9t con kh\u1EC9", "a monkey"],
  ["m\u1ED9t con b\xF2", "a cow"],
  ["m\u1ED9t con g\xE0", "a chicken"],
  ["m\u1ED9t con b\u01B0\u1EDBm", "a butterfly"]
].map(([vi, en]) => ({ vi, en }));
var A1_BOOKS = [
  ["m\u1ED9t cu\u1ED1n truy\u1EC7n", "a storybook"],
  ["m\u1ED9t cu\u1ED1n ti\u1EC3u thuy\u1EBFt", "a novel"],
  ["m\u1ED9t t\u1EDD b\xE1o", "a newspaper"],
  ["m\u1ED9t t\u1EA1p ch\xED", "a magazine"],
  ["m\u1ED9t cu\u1ED1n t\u1EEB \u0111i\u1EC3n", "a dictionary"],
  ["m\u1ED9t cu\u1ED1n truy\u1EC7n tranh", "a comic book"],
  ["m\u1ED9t cu\u1ED1n s\xE1ch n\u1EA5u \u0103n", "a cookbook"],
  ["m\u1ED9t quy\u1EC3n s\xE1ch gi\xE1o khoa", "a textbook"],
  ["m\u1ED9t l\xE1 th\u01B0", "a letter"],
  ["m\u1ED9t t\u1EA5m b\u1EA3n \u0111\u1ED3", "a map"]
].map(([vi, en]) => ({ vi, en }));
var A1_FRAMES = [
  { vi: "T\xF4i th\xEDch \u0103n {item}.", en: "I like eating {item}.", hint: "like eating = th\xEDch \u0103n", items: A1_ITEMS },
  { vi: "T\xF4i c\xF3 {item}.", en: "I have {item}.", hint: "have = c\xF3", items: A1_OBJECTS },
  { vi: "T\xF4i nh\xECn th\u1EA5y {item} trong c\xF4ng vi\xEAn.", en: "I see {item} in the park.", hint: "see = nh\xECn th\u1EA5y; in the park = trong c\xF4ng vi\xEAn", items: A1_ANIMALS },
  { vi: "T\xF4i mu\u1ED1n mua {item}.", en: "I want to buy {item}.", hint: "want to buy = mu\u1ED1n mua", items: A1_OBJECTS },
  { vi: "T\xF4i \u0111i \u0111\u1EBFn {item} v\xE0o cu\u1ED1i tu\u1EA7n.", en: "I go to {item} at the weekend.", hint: "go to = \u0111i \u0111\u1EBFn; at the weekend = v\xE0o cu\u1ED1i tu\u1EA7n", items: A1_PLACES },
  { vi: "T\xF4i u\u1ED1ng {item} v\xE0o bu\u1ED5i s\xE1ng.", en: "I drink {item} in the morning.", hint: "drink = u\u1ED1ng; in the morning = v\xE0o bu\u1ED5i s\xE1ng", items: A1_DRINKS },
  { vi: "T\xF4i m\u1EB7c {item} khi tr\u1EDDi l\u1EA1nh.", en: "I wear {item} when it is cold.", hint: "wear = m\u1EB7c; when it is cold = khi tr\u1EDDi l\u1EA1nh", items: A1_CLOTHES },
  { vi: "T\xF4i th\u01B0\u1EDDng \u0111\u1ECDc {item} tr\u01B0\u1EDBc khi ng\u1EE7.", en: "I often read {item} before bed.", hint: "often = th\u01B0\u1EDDng; before bed = tr\u01B0\u1EDBc khi ng\u1EE7", items: A1_BOOKS },
  { vi: "T\xF4i mu\u1ED1n \u0111\u1EBFn {item} h\xF4m nay.", en: "I want to go to {item} today.", hint: "want to go = mu\u1ED1n \u0111i; today = h\xF4m nay", items: A1_PLACES },
  { vi: "T\xF4i nh\xECn th\u1EA5y {item} g\u1EA7n nh\xE0.", en: "I see {item} near my house.", hint: "near my house = g\u1EA7n nh\xE0", items: A1_ANIMALS }
];
var A2_ITEMS = [
  ["m\u1ED9t l\u1EDBp n\u1EA5u \u0103n", "a cooking class"],
  ["m\u1ED9t chuy\u1EBFn \u0111i ng\u1EAFn", "a short trip"],
  ["m\u1ED9t b\u1ED9 phim m\u1EDBi", "a new film"],
  ["m\u1ED9t chi\u1EBFc xe bu\xFDt", "a bus"],
  ["m\u1ED9t c\u0103n ph\xF2ng y\xEAn t\u0129nh", "a quiet room"],
  ["m\u1ED9t chi\u1EBFc m\xE1y \u1EA3nh t\u1ED1t", "a good camera"],
  ["m\u1ED9t c\xF4ng vi\u1EC7c b\xE1n th\u1EDDi gian", "a part-time job"],
  ["m\u1ED9t nh\xE0 h\xE0ng \u0111\u1ECBa ph\u01B0\u01A1ng", "a local restaurant"],
  ["m\u1ED9t kh\xF3a h\u1ECDc tr\u1EF1c tuy\u1EBFn", "an online course"],
  ["m\u1ED9t \u0111\xF4i gi\xE0y tho\u1EA3i m\xE1i", "comfortable shoes"]
].map(([vi, en]) => ({ vi, en }));
var A2_PLACES = [
  ["\u0110\xE0 N\u1EB5ng", "Da Nang"],
  ["H\xE0 N\u1ED9i", "Hanoi"],
  ["H\u1ED9i An", "Hoi An"],
  ["m\u1ED9t th\u1ECB tr\u1EA5n nh\u1ECF", "a small town"],
  ["m\u1ED9t h\xF2n \u0111\u1EA3o y\xEAn b\xECnh", "a peaceful island"],
  ["v\xF9ng n\xFAi ph\xEDa b\u1EAFc", "the northern mountains"],
  ["m\u1ED9t khu ch\u1EE3 \u0111\xEAm", "a night market"],
  ["m\u1ED9t b\u1EA3o t\xE0ng m\u1EDBi", "a new museum"],
  ["m\u1ED9t khu ngh\u1EC9 d\u01B0\u1EE1ng", "a resort"],
  ["m\u1ED9t ng\xF4i l\xE0ng ven bi\u1EC3n", "a coastal village"]
].map(([vi, en]) => ({ vi, en }));
var A2_SERVICES = [
  ["\u0111\u1ED5i l\u1ECBch h\u1EB9n", "reschedule the appointment"],
  ["gi\u1EA3i th\xEDch h\xF3a \u0111\u01A1n", "explain the bill"],
  ["g\u1ECDi taxi", "call a taxi"],
  ["\u0111\u1EB7t b\xE0n", "book a table"],
  ["s\u1EEDa chi\u1EBFc xe \u0111\u1EA1p", "repair the bicycle"],
  ["g\u1EEDi email", "send an email"],
  ["m\u01B0\u1EE3n m\u1ED9t cu\u1ED1n s\xE1ch", "borrow a book"],
  ["in t\xE0i li\u1EC7u", "print the document"],
  ["\u0111\u1ED5i ph\xF2ng", "change the room"],
  ["h\u1EE7y v\xE9", "cancel the ticket"]
].map(([vi, en]) => ({ vi, en }));
var A2_FRAMES = [
  { vi: "T\xF4i \u0111\xE3 l\xEAn k\u1EBF ho\u1EA1ch cho {item}.", en: "I have made plans for {item}.", hint: "make plans for = l\xEAn k\u1EBF ho\u1EA1ch cho", items: A2_ITEMS },
  { vi: "T\xF4i d\u1EF1 \u0111\u1ECBnh s\u1EBD \u0111\u1EBFn {item} v\xE0o m\xF9a h\xE8 n\xE0y.", en: "I plan to visit {item} this summer.", hint: "plan to visit = d\u1EF1 \u0111\u1ECBnh \u0111\u1EBFn th\u0103m; this summer = m\xF9a h\xE8 n\xE0y", items: A2_PLACES },
  { vi: "B\u1EA1n c\xF3 th\u1EC3 gi\xFAp t\xF4i {item} kh\xF4ng?", en: "Could you help me {item}?", hint: "could you help me = b\u1EA1n c\xF3 th\u1EC3 gi\xFAp t\xF4i", items: A2_SERVICES },
  { vi: "T\xF4i \u0111\xE3 t\u1EEBng th\u1EED {item}.", en: "I have tried {item} before.", hint: "have tried = \u0111\xE3 t\u1EEBng th\u1EED; before = tr\u01B0\u1EDBc \u0111\xE2y", items: A2_SERVICES },
  { vi: "Ch\xFAng ta n\xEAn \u0111\u1EB7t {item} tr\u01B0\u1EDBc.", en: "We should book {item} in advance.", hint: "should = n\xEAn; in advance = tr\u01B0\u1EDBc", items: A2_ITEMS },
  { vi: "T\xF4i th\u1EA5y {item} kh\xE1 h\u1EEFu \xEDch.", en: "I find {item} quite useful.", hint: "find ... useful = th\u1EA5y ... h\u1EEFu \xEDch; quite = kh\xE1", items: A2_ITEMS },
  { vi: "T\xF4i th\u01B0\u1EDDng gh\xE9 qua {item} sau gi\u1EDD l\xE0m.", en: "I often stop by {item} after work.", hint: "stop by = gh\xE9 qua; after work = sau gi\u1EDD l\xE0m", items: A2_PLACES },
  { vi: "T\xF4i c\u1EA7n th\xEAm th\u1EDDi gian \u0111\u1EC3 {item}.", en: "I need more time to {item}.", hint: "need more time to = c\u1EA7n th\xEAm th\u1EDDi gian \u0111\u1EC3", items: A2_SERVICES },
  { vi: "Th\u1EDDi ti\u1EBFt \u1EDF {item} th\u01B0\u1EDDng d\u1EC5 ch\u1ECBu.", en: "The weather in {item} is usually pleasant.", hint: "usually pleasant = th\u01B0\u1EDDng d\u1EC5 ch\u1ECBu", items: A2_PLACES },
  { vi: "T\xF4i vui v\xEC \u0111\xE3 ch\u1ECDn {item}.", en: "I am glad that I chose {item}.", hint: "be glad = vui; choose = ch\u1ECDn", items: A2_ITEMS }
];
var B1_ITEMS = [
  ["c\u1EA3i thi\u1EC7n k\u1EF9 n\u0103ng giao ti\u1EBFp", "improve communication skills"],
  ["l\xE0m vi\u1EC7c v\u1EDBi m\u1ED9t nh\xF3m \u0111a qu\u1ED1c gia", "work with a multicultural team"],
  ["h\u1ECDc m\u1ED9t ng\xF4n ng\u1EEF m\u1EDBi", "learn a new language"],
  ["tham gia ho\u1EA1t \u0111\u1ED9ng t\xECnh nguy\u1EC7n", "join a volunteer activity"],
  ["duy tr\xEC th\xF3i quen l\xE0nh m\u1EA1nh", "maintain a healthy habit"],
  ["\u0111\u1ECDc tin t\u1EE9c m\u1ED7i ng\xE0y", "read the news every day"],
  ["l\u1EADp k\u1EBF ho\u1EA1ch cho t\u01B0\u01A1ng lai", "plan for the future"],
  ["gi\u1EA3m th\u1EDDi gian d\xF9ng \u0111i\u1EC7n tho\u1EA1i", "reduce phone time"],
  ["b\u1EA3o v\u1EC7 m\xF4i tr\u01B0\u1EDDng", "protect the environment"],
  ["c\xE2n b\u1EB1ng c\xF4ng vi\u1EC7c v\xE0 cu\u1ED9c s\u1ED1ng", "balance work and life"]
].map(([vi, en]) => ({ vi, en }));
var B1_TOPICS = [
  ["gi\xE1o d\u1EE5c tr\u1EF1c tuy\u1EBFn", "online education"],
  ["giao th\xF4ng c\xF4ng c\u1ED9ng", "public transport"],
  ["l\xE0m vi\u1EC7c t\u1EEB xa", "remote work"],
  ["du l\u1ECBch b\u1EC1n v\u1EEFng", "sustainable tourism"],
  ["th\u1EC3 thao h\u1ECDc \u0111\u01B0\u1EDDng", "school sports"],
  ["th\xF3i quen \u0111\u1ECDc s\xE1ch", "reading habits"],
  ["s\u1EE9c kh\u1ECFe tinh th\u1EA7n", "mental health"],
  ["n\u0103ng l\u01B0\u1EE3ng t\xE1i t\u1EA1o", "renewable energy"],
  ["v\u0103n h\xF3a \u0111\u1ECBa ph\u01B0\u01A1ng", "local culture"],
  ["c\xF4ng ngh\u1EC7 trong l\u1EDBp h\u1ECDc", "technology in the classroom"]
].map(([vi, en]) => ({ vi, en }));
var B1_FRAMES = [
  { vi: "T\xF4i tin r\u1EB1ng {item} r\u1EA5t quan tr\u1ECDng trong cu\u1ED9c s\u1ED1ng hi\u1EC7n \u0111\u1EA1i.", en: "I believe that {item} is important in modern life.", hint: "believe that = tin r\u1EB1ng; important = quan tr\u1ECDng", items: B1_TOPICS },
  { vi: "T\xF4i \u0111ang c\u1ED1 g\u1EAFng {item}.", en: "I am trying to {item}.", hint: "be trying to = \u0111ang c\u1ED1 g\u1EAFng", items: B1_ITEMS },
  { vi: "Theo t\xF4i, {item} mang l\u1EA1i nhi\u1EC1u l\u1EE3i \xEDch.", en: "In my opinion, {item} brings many benefits.", hint: "in my opinion = theo t\xF4i; benefits = l\u1EE3i \xEDch", items: B1_TOPICS },
  { vi: "T\xF4i \u0111\xE3 h\u1ECDc \u0111\u01B0\u1EE3c nhi\u1EC1u \u0111i\u1EC1u khi {item}.", en: "I have learned a lot by {item}.", hint: "learn a lot by = h\u1ECDc \u0111\u01B0\u1EE3c nhi\u1EC1u \u0111i\u1EC1u khi", items: B1_ITEMS },
  { vi: "M\u1ED9t gi\u1EA3i ph\xE1p cho v\u1EA5n \u0111\u1EC1 n\xE0y l\xE0 {item}.", en: "One solution to this problem is to {item}.", hint: "one solution = m\u1ED9t gi\u1EA3i ph\xE1p; problem = v\u1EA5n \u0111\u1EC1", items: B1_ITEMS },
  { vi: "T\xF4i mu\u1ED1n th\u1EA3o lu\u1EADn th\xEAm v\u1EC1 {item}.", en: "I would like to discuss {item} further.", hint: "would like to discuss = mu\u1ED1n th\u1EA3o lu\u1EADn; further = th\xEAm", items: B1_TOPICS },
  { vi: "T\xF4i nh\u1EADn th\u1EA5y {item} \u0111ang thay \u0111\u1ED5i nhanh ch\xF3ng.", en: "I have noticed that {item} is changing quickly.", hint: "have noticed = nh\u1EADn th\u1EA5y; quickly = nhanh ch\xF3ng", items: B1_TOPICS },
  { vi: "Ch\xFAng ta c\xF3 th\u1EC3 b\u1EAFt \u0111\u1EA7u b\u1EB1ng c\xE1ch {item}.", en: "We can start by {item}.", hint: "start by = b\u1EAFt \u0111\u1EA7u b\u1EB1ng c\xE1ch", items: B1_ITEMS },
  { vi: "T\xF4i \u0111\u1ED3ng \xFD r\u1EB1ng {item} c\u1EA7n \u0111\u01B0\u1EE3c quan t\xE2m h\u01A1n.", en: "I agree that {item} deserves more attention.", hint: "agree that = \u0111\u1ED3ng \xFD r\u1EB1ng; deserve attention = c\u1EA7n \u0111\u01B0\u1EE3c quan t\xE2m", items: B1_TOPICS },
  { vi: "T\xF4i hy v\u1ECDng s\u1EBD ti\u1EBFp t\u1EE5c {item} trong n\u0103m t\u1EDBi.", en: "I hope to continue to {item} next year.", hint: "hope to continue = hy v\u1ECDng ti\u1EBFp t\u1EE5c; next year = n\u0103m t\u1EDBi", items: B1_ITEMS }
];
var B2_ITEMS = [
  ["ph\xE2n t\xEDch d\u1EEF li\u1EC7u kh\xE1ch h\xE0ng", "analyze customer data"],
  ["\u0111\xE1nh gi\xE1 hi\u1EC7u qu\u1EA3 c\u1EE7a chi\u1EBFn d\u1ECBch", "evaluate the campaign performance"],
  ["t\u1ED1i \u01B0u h\xF3a quy tr\xECnh l\xE0m vi\u1EC7c", "optimize the workflow"],
  ["x\xE2y d\u1EF1ng k\u1EBF ho\u1EA1ch d\u1EF1 ph\xF2ng", "develop a contingency plan"],
  ["\u0111\xE0o t\u1EA1o nh\xE2n vi\xEAn m\u1EDBi", "train new employees"],
  ["tri\u1EC3n khai h\u1EC7 th\u1ED1ng an to\xE0n h\u01A1n", "deploy a safer system"],
  ["thuy\u1EBFt ph\u1EE5c c\xE1c b\xEAn li\xEAn quan", "persuade the stakeholders"],
  ["gi\u1EA3m chi ph\xED v\u1EADn h\xE0nh", "reduce operating costs"],
  ["m\u1EDF r\u1ED9ng sang th\u1ECB tr\u01B0\u1EDDng m\u1EDBi", "expand into a new market"],
  ["gi\u1EA3i quy\u1EBFt nguy\xEAn nh\xE2n g\u1ED1c r\u1EC5", "address the root cause"]
].map(([vi, en]) => ({ vi, en }));
var B2_TOPICS = [
  ["s\u1EF1 minh b\u1EA1ch trong qu\u1EA3n tr\u1ECB", "transparency in governance"],
  ["t\u1EF1 \u0111\u1ED9ng h\xF3a quy tr\xECnh", "process automation"],
  ["b\u1EA3o m\u1EADt d\u1EEF li\u1EC7u c\xE1 nh\xE2n", "personal data security"],
  ["chu\u1ED7i cung \u1EE9ng linh ho\u1EA1t", "a resilient supply chain"],
  ["v\u0103n h\xF3a ph\u1EA3n h\u1ED3i c\u1EDFi m\u1EDF", "an open feedback culture"],
  ["\u0111\u1EA7u t\u01B0 d\xE0i h\u1EA1n v\xE0o nh\xE2n s\u1EF1", "long-term investment in people"],
  ["ti\xEAu chu\u1EA9n d\u1ECBch v\u1EE5 nh\u1EA5t qu\xE1n", "consistent service standards"],
  ["chi\u1EBFn l\u01B0\u1EE3c t\u0103ng tr\u01B0\u1EDFng c\xF3 tr\xE1ch nhi\u1EC7m", "a responsible growth strategy"],
  ["h\u1EE3p t\xE1c gi\u1EEFa c\xE1c ph\xF2ng ban", "cross-department collaboration"],
  ["m\u1EE5c ti\xEAu gi\u1EA3m ph\xE1t th\u1EA3i", "emission-reduction targets"]
].map(([vi, en]) => ({ vi, en }));
var B2_FRAMES = [
  { vi: "\u0110\u1EC3 \u0111\u1EA1t m\u1EE5c ti\xEAu, c\xF4ng ty c\u1EA7n {item}.", en: "To achieve its goal, the company needs to {item}.", hint: "to achieve its goal = \u0111\u1EC3 \u0111\u1EA1t m\u1EE5c ti\xEAu; need to = c\u1EA7n", items: B2_ITEMS },
  { vi: "Ban l\xE3nh \u0111\u1EA1o \u0111ang xem x\xE9t {item}.", en: "The leadership team is considering {item}.", hint: "leadership team = ban l\xE3nh \u0111\u1EA1o; consider = xem x\xE9t", items: B2_TOPICS },
  { vi: "Ch\xFAng t\xF4i ph\u1EA3i c\xE2n nh\u1EAFc k\u1EF9 tr\u01B0\u1EDBc khi {item}.", en: "We must think carefully before we {item}.", hint: "think carefully = c\xE2n nh\u1EAFc k\u1EF9; before = tr\u01B0\u1EDBc khi", items: B2_ITEMS },
  { vi: "B\xE1o c\xE1o cho th\u1EA5y {item} c\xF3 th\u1EC3 t\u1EA1o ra l\u1EE3i th\u1EBF c\u1EA1nh tranh.", en: "The report shows that {item} could create a competitive advantage.", hint: "report shows = b\xE1o c\xE1o cho th\u1EA5y; competitive advantage = l\u1EE3i th\u1EBF c\u1EA1nh tranh", items: B2_TOPICS },
  { vi: "N\u1EBFu {item}, ch\xFAng ta s\u1EBD ti\u1EBFt ki\u1EC7m \u0111\u01B0\u1EE3c nhi\u1EC1u th\u1EDDi gian.", en: "If we {item}, we will save a great deal of time.", hint: "if = n\u1EBFu; save time = ti\u1EBFt ki\u1EC7m th\u1EDDi gian", items: B2_ITEMS },
  { vi: "Nh\xF3m \u0111\xE3 th\u1ED1ng nh\u1EA5t s\u1EBD \u01B0u ti\xEAn {item}.", en: "The team agreed to prioritize {item}.", hint: "agree to prioritize = th\u1ED1ng nh\u1EA5t \u01B0u ti\xEAn", items: B2_ITEMS },
  { vi: "M\u1ED9t th\xE1ch th\u1EE9c l\u1EDBn l\xE0 \u0111\u1EA3m b\u1EA3o {item}.", en: "A major challenge is ensuring {item}.", hint: "major challenge = th\xE1ch th\u1EE9c l\u1EDBn; ensure = \u0111\u1EA3m b\u1EA3o", items: B2_TOPICS },
  { vi: "Ch\xFAng t\xF4i c\u1EA7n b\u1EB1ng ch\u1EE9ng r\xF5 r\xE0ng tr\u01B0\u1EDBc khi \u0111\u1EA7u t\u01B0 v\xE0o {item}.", en: "We need clear evidence before investing in {item}.", hint: "clear evidence = b\u1EB1ng ch\u1EE9ng r\xF5 r\xE0ng; invest in = \u0111\u1EA7u t\u01B0 v\xE0o", items: B2_TOPICS },
  { vi: "K\u1EBF ho\u1EA1ch m\u1EDBi s\u1EBD gi\xFAp doanh nghi\u1EC7p {item}.", en: "The new plan will help the business {item}.", hint: "new plan = k\u1EBF ho\u1EA1ch m\u1EDBi; help the business = gi\xFAp doanh nghi\u1EC7p", items: B2_ITEMS },
  { vi: "T\xF4i cho r\u1EB1ng {item} n\xEAn \u0111\u01B0\u1EE3c \u0111o l\u01B0\u1EDDng th\u01B0\u1EDDng xuy\xEAn.", en: "I believe that {item} should be measured regularly.", hint: "should be measured = n\xEAn \u0111\u01B0\u1EE3c \u0111o l\u01B0\u1EDDng; regularly = th\u01B0\u1EDDng xuy\xEAn", items: B2_TOPICS }
];
var C1_ITEMS = [
  ["thi\u1EBFt l\u1EADp m\u1ED9t khung qu\u1EA3n tr\u1ECB minh b\u1EA1ch", "establish a transparent governance framework"],
  ["\u0111\xE1nh gi\xE1 t\xE1c \u0111\u1ED9ng d\xE0i h\u1EA1n c\u1EE7a ch\xEDnh s\xE1ch", "assess the long-term impact of the policy"],
  ["\u0111i\u1EC1u ph\u1ED1i l\u1EE3i \xEDch c\u1EE7a nhi\u1EC1u b\xEAn li\xEAn quan", "coordinate the interests of multiple stakeholders"],
  ["c\u1EE7ng c\u1ED1 kh\u1EA3 n\u0103ng ch\u1ED1ng ch\u1ECBu c\u1EE7a t\u1ED5 ch\u1EE9c", "strengthen the organization's resilience"],
  ["\u0111\u1EA7u t\u01B0 c\xF3 ch\u1ECDn l\u1ECDc v\xE0o \u0111\u1ED5i m\u1EDBi s\xE1ng t\u1EA1o", "invest selectively in innovation"],
  ["gi\u1EA3m thi\u1EC3u nh\u1EEFng h\u1EC7 qu\u1EA3 ngo\xE0i d\u1EF1 ki\u1EBFn", "mitigate unintended consequences"],
  ["x\xE2y d\u1EF1ng s\u1EF1 \u0111\u1ED3ng thu\u1EADn trong c\u1ED9ng \u0111\u1ED3ng", "build consensus within the community"],
  ["b\u1EA3o v\u1EC7 quy\u1EC1n ri\xEAng t\u01B0 trong k\u1EF7 nguy\xEAn s\u1ED1", "protect privacy in the digital age"],
  ["di\u1EC5n gi\u1EA3i d\u1EEF li\u1EC7u m\u1ED9t c\xE1ch c\xF3 tr\xE1ch nhi\u1EC7m", "interpret data responsibly"],
  ["c\xE2n b\u1EB1ng t\u0103ng tr\u01B0\u1EDFng v\u1EDBi ph\xE1t tri\u1EC3n b\u1EC1n v\u1EEFng", "balance growth with sustainable development"]
].map(([vi, en]) => ({ vi, en }));
var C1_TOPICS = [
  ["nh\u1EEFng c\u1EA3i c\xE1ch th\u1EC3 ch\u1EBF s\xE2u r\u1ED9ng", "far-reaching institutional reforms"],
  ["m\u1ED9t chi\u1EBFn l\u01B0\u1EE3c chuy\u1EC3n \u0111\u1ED5i s\u1ED1 to\xE0n di\u1EC7n", "a comprehensive digital-transformation strategy"],
  ["m\xF4 h\xECnh kinh t\u1EBF tu\u1EA7n ho\xE0n", "a circular-economy model"],
  ["s\u1EF1 ph\xE2n c\u1EF1c ng\xE0y c\xE0ng gia t\u0103ng", "increasing polarization"],
  ["ti\xEAu chu\u1EA9n \u0111\u1EA1o \u0111\u1EE9c nh\u1EA5t qu\xE1n", "consistent ethical standards"],
  ["c\xE1ch ti\u1EBFp c\u1EADn d\u1EF1a tr\xEAn b\u1EB1ng ch\u1EE9ng", "an evidence-based approach"],
  ["t\u1EA7m nh\xECn d\xE0i h\u1EA1n cho gi\xE1o d\u1EE5c", "a long-term vision for education"],
  ["c\u01A1 ch\u1EBF h\u1EE3p t\xE1c xuy\xEAn bi\xEAn gi\u1EDBi", "a cross-border cooperation mechanism"],
  ["c\xE1c r\u1EE7i ro \u0111\u1ECBa ch\xEDnh tr\u1ECB m\u1EDBi n\u1ED5i", "emerging geopolitical risks"],
  ["m\u1ED9t n\u1EC1n v\u0103n h\xF3a h\u1ECDc h\u1ECFi li\xEAn t\u1EE5c", "a culture of continuous learning"]
].map(([vi, en]) => ({ vi, en }));
var C1_FRAMES = [
  { vi: "M\u1ED9t c\xE1ch ti\u1EBFp c\u1EADn th\u1EADn tr\u1ECDng l\xE0 {item}.", en: "A prudent approach would be to {item}.", hint: "prudent approach = c\xE1ch ti\u1EBFp c\u1EADn th\u1EADn tr\u1ECDng; would be to = l\xE0 n\xEAn", items: C1_ITEMS },
  { vi: "Cu\u1ED9c tranh lu\u1EADn hi\u1EC7n nay t\u1EADp trung v\xE0o {item}.", en: "The current debate centers on {item}.", hint: "current debate = cu\u1ED9c tranh lu\u1EADn hi\u1EC7n nay; center on = t\u1EADp trung v\xE0o", items: C1_TOPICS },
  { vi: "Ch\xEDnh s\xE1ch ch\u1EC9 c\xF3 \xFD ngh\u0129a n\u1EBFu n\xF3 c\xF3 th\u1EC3 {item}.", en: "The policy is meaningful only if it can {item}.", hint: "meaningful only if = ch\u1EC9 c\xF3 \xFD ngh\u0129a n\u1EBFu", items: C1_ITEMS },
  { vi: "C\xE1c chuy\xEAn gia c\u1EA3nh b\xE1o r\u1EB1ng {item} c\xF3 th\u1EC3 l\xE0m tr\u1EA7m tr\u1ECDng th\xEAm b\u1EA5t b\xECnh \u0111\u1EB3ng.", en: "Experts warn that {item} could exacerbate inequality.", hint: "warn that = c\u1EA3nh b\xE1o r\u1EB1ng; exacerbate inequality = l\xE0m tr\u1EA7m tr\u1ECDng th\xEAm b\u1EA5t b\xECnh \u0111\u1EB3ng", items: C1_TOPICS },
  { vi: "Vi\u1EC7c c\xE2n nh\u1EAFc {item} \u0111\xF2i h\u1ECFi s\u1EF1 ph\u1ED1i h\u1EE3p li\xEAn ng\xE0nh.", en: "Addressing {item} requires interdisciplinary coordination.", hint: "addressing = vi\u1EC7c gi\u1EA3i quy\u1EBFt; interdisciplinary = li\xEAn ng\xE0nh", items: C1_TOPICS },
  { vi: "Ch\xFAng ta kh\xF4ng n\xEAn \u0111\xE1nh gi\xE1 th\u1EA5p t\u1EA7m quan tr\u1ECDng c\u1EE7a vi\u1EC7c c\u1ED1 g\u1EAFng {item}.", en: "We should not underestimate the importance of making an effort to {item}.", hint: "underestimate = \u0111\xE1nh gi\xE1 th\u1EA5p; importance = t\u1EA7m quan tr\u1ECDng", items: C1_ITEMS },
  { vi: "M\u1ED9t h\u1EC7 qu\u1EA3 kh\xF3 tr\xE1nh kh\u1ECFi l\xE0 {item}.", en: "An inevitable consequence is {item}.", hint: "inevitable consequence = h\u1EC7 qu\u1EA3 kh\xF3 tr\xE1nh kh\u1ECFi", items: C1_TOPICS },
  { vi: "B\xE1o c\xE1o nh\u1EA5n m\u1EA1nh nhu c\u1EA7u c\u1EA5p thi\u1EBFt ph\u1EA3i {item}.", en: "The report underscores the pressing need to {item}.", hint: "underscore = nh\u1EA5n m\u1EA1nh; pressing need = nhu c\u1EA7u c\u1EA5p thi\u1EBFt", items: C1_ITEMS },
  { vi: "M\u1ED9t th\u1ECFa hi\u1EC7p kh\u1EA3 thi c\xF3 th\u1EC3 bao g\u1ED3m vi\u1EC7c {item}.", en: "A viable compromise could involve an effort to {item}.", hint: "viable compromise = th\u1ECFa hi\u1EC7p kh\u1EA3 thi; involve = bao g\u1ED3m", items: C1_ITEMS },
  { vi: "\u0110\u1EC3 duy tr\xEC ni\u1EC1m tin c\xF4ng ch\xFAng, c\xE1c c\u01A1 quan c\u1EA7n quan t\xE2m \u0111\u1EBFn {item}.", en: "To maintain public trust, institutions must address {item}.", hint: "maintain public trust = duy tr\xEC ni\u1EC1m tin c\xF4ng ch\xFAng", items: C1_TOPICS }
];
var ADULT_QUESTION_BANK = [
  ...buildLevel("A1", 5001, A1_FRAMES),
  ...buildLevel("A2", 5101, A2_FRAMES),
  ...buildLevel("B1", 5201, B1_FRAMES),
  ...buildLevel("B2", 5301, B2_FRAMES),
  ...buildLevel("C1", 5401, C1_FRAMES)
];

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
  },
  ...ADULT_QUESTION_BANK
];

// src/data/specializedQuestions.ts
var templates = {
  it: [
    { vi: "Nh\xF3m ph\xE1t tri\u1EC3n s\u1EBD r\xE0 so\xE1t pull request tr\u01B0\u1EDBc cu\u1ED9c h\u1ECDp.", en: "The development team will review the pull request before the meeting.", hint: "review a pull request", level: "B1" },
    { vi: "Ch\xFAng t\xF4i c\u1EA7n ki\u1EC3m tra nh\u1EADt k\xFD \u0111\u1EC3 t\xECm nguy\xEAn nh\xE2n l\u1ED7i.", en: "We need to check the logs to find the root cause of the bug.", hint: "check the logs; root cause", level: "B1" },
    { vi: "K\u1EF9 s\u01B0 \u0111\xE3 tri\u1EC3n khai b\u1EA3n s\u1EEDa l\u1ED7i l\xEAn m\xF4i tr\u01B0\u1EDDng th\u1EED nghi\u1EC7m.", en: "The engineer deployed the fix to the staging environment.", hint: "deploy a fix; staging environment", level: "B1" },
    { vi: "API n\xE0y c\u1EA7n x\xE1c th\u1EF1c tr\u01B0\u1EDBc khi nh\u1EADn d\u1EEF li\u1EC7u kh\xE1ch h\xE0ng.", en: "This API needs authentication before it accepts customer data.", hint: "needs authentication; accept data", level: "B2" },
    { vi: "Ch\xFAng ta n\xEAn t\u1EF1 \u0111\u1ED9ng h\xF3a b\u01B0\u1EDBc ki\u1EC3m th\u1EED h\u1ED3i quy.", en: "We should automate the regression testing step.", hint: "automate regression testing", level: "B2" },
    { vi: "Ki\u1EBFn tr\xFAc m\u1EDBi gi\xFAp h\u1EC7 th\u1ED1ng m\u1EDF r\u1ED9ng d\u1EC5 d\xE0ng h\u01A1n.", en: "The new architecture makes the system easier to scale.", hint: "architecture; scale", level: "B2" },
    { vi: "H\xE3y ghi r\xF5 thay \u0111\u1ED5i ph\xE1 v\u1EE1 trong t\xE0i li\u1EC7u ph\xE1t h\xE0nh.", en: "Please document the breaking changes in the release notes.", hint: "breaking changes; release notes", level: "C1" },
    { vi: "M\xE1y ch\u1EE7 c\u01A1 s\u1EDF d\u1EEF li\u1EC7u c\u1EA7n m\u1ED9t b\u1EA3n sao l\u01B0u m\xE3 h\xF3a.", en: "The database server needs an encrypted backup.", hint: "database server; encrypted backup", level: "A2" },
    { vi: "Nh\xF3m \u0111ang theo d\xF5i \u0111\u1ED9 tr\u1EC5 c\u1EE7a d\u1ECBch v\u1EE5 theo th\u1EDDi gian th\u1EF1c.", en: "The team is monitoring the service latency in real time.", hint: "monitor service latency", level: "B1" },
    { vi: "Ch\xFAng t\xF4i s\u1EBD ph\xE1t h\xE0nh t\xEDnh n\u0103ng sau khi s\u1EA3n ph\u1EA9m \u0111\u01B0\u1EE3c ph\xEA duy\u1EC7t.", en: "We will release the feature after the product is approved.", hint: "release a feature; be approved", level: "A2" }
  ],
  business: [
    { vi: "Ch\xFAng t\xF4i mu\u1ED1n hi\u1EC3u r\xF5 m\u1EE5c ti\xEAu c\u1EE7a kh\xE1ch h\xE0ng tr\u01B0\u1EDBc khi b\xE1o gi\xE1.", en: "We want to understand the client goals before preparing a quote.", hint: "client goals; prepare a quote", level: "B1" },
    { vi: "\u0110\u1ED9i kinh doanh s\u1EBD tr\xECnh b\xE0y \u0111\u1EC1 xu\u1EA5t v\xE0o th\u1EE9 S\xE1u.", en: "The sales team will present the proposal on Friday.", hint: "present a proposal", level: "A2" },
    { vi: "Hai b\xEAn c\u1EA7n th\u1ED1ng nh\u1EA5t \u0111i\u1EC1u kho\u1EA3n thanh to\xE1n trong h\u1EE3p \u0111\u1ED3ng.", en: "Both parties need to agree on the payment terms in the contract.", hint: "agree on payment terms", level: "B1" },
    { vi: "Ch\xFAng t\xF4i \u0111\xE3 t\u0103ng t\u1EF7 l\u1EC7 chuy\u1EC3n \u0111\u1ED5i nh\u1EDD th\u1EED nghi\u1EC7m A/B.", en: "We increased the conversion rate through A/B testing.", hint: "conversion rate; A/B testing", level: "B2" },
    { vi: "H\xE3y g\u1EEDi b\u1EA3n t\xF3m t\u1EAFt cu\u1ED9c h\u1ECDp cho t\u1EA5t c\u1EA3 c\xE1c b\xEAn li\xEAn quan.", en: "Please send the meeting summary to all stakeholders.", hint: "meeting summary; stakeholders", level: "B1" },
    { vi: "Nh\xE0 \u0111\u1EA7u t\u01B0 mu\u1ED1n th\u1EA5y k\u1EBF ho\u1EA1ch t\u0103ng tr\u01B0\u1EDFng b\u1EC1n v\u1EEFng.", en: "The investor wants to see a sustainable growth plan.", hint: "sustainable growth plan", level: "B2" },
    { vi: "Ch\xFAng ta n\xEAn \u01B0u ti\xEAn kh\xE1ch h\xE0ng c\xF3 nhu c\u1EA7u c\u1EA5p thi\u1EBFt nh\u1EA5t.", en: "We should prioritize customers with the most urgent needs.", hint: "prioritize customers; urgent needs", level: "B1" },
    { vi: "B\xE1o c\xE1o qu\xFD cho th\u1EA5y doanh thu \u0111\xE3 v\u01B0\u1EE3t d\u1EF1 b\xE1o.", en: "The quarterly report shows that revenue exceeded the forecast.", hint: "quarterly report; exceed the forecast", level: "B2" },
    { vi: "Nh\xE2n vi\xEAn ch\u0103m s\xF3c kh\xE1ch h\xE0ng s\u1EBD g\u1ECDi l\u1EA1i trong h\xF4m nay.", en: "The customer success representative will call back today.", hint: "customer success; call back", level: "A2" },
    { vi: "M\u1ED9t chi\u1EBFn l\u01B0\u1EE3c \u0111\u1ECBnh gi\xE1 linh ho\u1EA1t c\xF3 th\u1EC3 b\u1EA3o v\u1EC7 l\u1EE3i nhu\u1EADn.", en: "A flexible pricing strategy can protect our profit margin.", hint: "pricing strategy; profit margin", level: "C1" }
  ],
  hospitality: [
    { vi: "Nh\xE2n vi\xEAn l\u1EC5 t\xE2n s\u1EBD x\xE1c nh\u1EADn \u0111\u1EB7t ph\xF2ng c\u1EE7a qu\xFD kh\xE1ch.", en: "The front desk agent will confirm your room reservation.", hint: "front desk; confirm a reservation", level: "A2" },
    { vi: "Nh\xE0 h\xE0ng c\xF3 th\u1EC3 chu\u1EA9n b\u1ECB m\u1ED9t b\u1EEFa \u0103n kh\xF4ng ch\u1EE9a s\u1EEFa.", en: "The restaurant can prepare a dairy-free meal.", hint: "dairy-free meal", level: "A2" },
    { vi: "Ch\xFAng t\xF4i r\u1EA5t ti\u1EBFc v\xEC \u0111i\u1EC1u h\xF2a trong ph\xF2ng ch\u01B0a ho\u1EA1t \u0111\u1ED9ng.", en: "We are very sorry that the air conditioning in the room is not working.", hint: "air conditioning; not working", level: "A2" },
    { vi: "H\u01B0\u1EDBng d\u1EABn vi\xEAn s\u1EBD \u0111\xF3n \u0111o\xE0n t\u1EA1i s\u1EA3nh l\xFAc t\xE1m gi\u1EDD.", en: "The tour guide will meet the group in the lobby at eight.", hint: "tour guide; meet the group", level: "A1" },
    { vi: "Xin vui l\xF2ng xu\u1EA5t tr\xECnh h\u1ED9 chi\u1EBFu khi nh\u1EADn ph\xF2ng.", en: "Please present your passport when you check in.", hint: "present a passport; check in", level: "A1" },
    { vi: "Kh\xE1ch s\u1EA1n cung c\u1EA5p d\u1ECBch v\u1EE5 \u0111\u01B0a \u0111\xF3n s\xE2n bay mi\u1EC5n ph\xED.", en: "The hotel provides a complimentary airport transfer service.", hint: "complimentary transfer", level: "B1" },
    { vi: "Ch\xFAng t\xF4i s\u1EBD x\u1EED l\xFD khi\u1EBFu n\u1EA1i c\u1EE7a qu\xFD kh\xE1ch ngay l\u1EADp t\u1EE9c.", en: "We will handle your complaint immediately.", hint: "handle a complaint", level: "B1" },
    { vi: "B\u1EEFa s\xE1ng \u0111\u01B0\u1EE3c ph\u1EE5c v\u1EE5 t\u1EEB s\xE1u gi\u1EDD r\u01B0\u1EE1i \u0111\u1EBFn m\u01B0\u1EDDi gi\u1EDD.", en: "Breakfast is served from half past six until ten.", hint: "breakfast is served", level: "A1" },
    { vi: "Ph\xF2ng n\xE0y c\xF3 t\u1EA7m nh\xECn \u0111\u1EB9p ra bi\u1EC3n.", en: "This room has a beautiful view of the sea.", hint: "a view of the sea", level: "A1" },
    { vi: "Qu\u1EA3n l\xFD s\u1EBD ki\u1EC3m tra ch\u1EA5t l\u01B0\u1EE3ng d\u1ECBch v\u1EE5 sau khi kh\xE1ch r\u1EDDi \u0111i.", en: "The manager will check the service quality after the guest leaves.", hint: "service quality; after the guest leaves", level: "B2" }
  ]
};
function makeQuestion(category, index) {
  const item = templates[category][index % templates[category].length];
  const batch = Math.floor(index / templates[category].length) + 1;
  const context = batch === 1 ? "" : ` (ca ${batch})`;
  const answer = `${item.en.replace(/\.$/, "")}${context}.`;
  return {
    id: 1e5 + (category === "it" ? 0 : category === "business" ? 1e3 : 2e3) + index,
    vi: `${item.vi}${context}`,
    hints: item.hint,
    answers: [answer, item.en],
    category,
    level: item.level,
    created_date: "2026-01-01"
  };
}
var SPECIALIZED_QUESTIONS = ["it", "business", "hospitality"].flatMap((category) => Array.from({ length: 1e3 }, (_, index) => makeQuestion(category, index)));

// server/durableDuel.ts
import crypto from "node:crypto";
var LEASE_MS = 6e4;
var push = (s, event) => {
  s.events.push({ ...event, eventId: ++s.seq });
  s.events = s.events.slice(-80);
};
var norm = (s) => s.toLowerCase().trim().replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[.,!?;:()]/g, "").replace(/\s+/g, " ");
function participant(player, host) {
  const { email, ...identity } = player;
  return { ...identity, isHost: host, score: 0, currentQuestionIndex: 0, answeredCount: 0, isReady: host, isFinished: false };
}
function broadcast(db, room, event, except) {
  for (const key of room.members) if (key !== except && db.sessions[key]) push(db.sessions[key], event);
}
function leave(db, key) {
  const s = db.sessions[key];
  if (!s) return;
  delete s.queued;
  const r = s.roomId && db.rooms[s.roomId];
  delete s.roomId;
  for (const [id, inv] of Object.entries(db.invites)) if (inv.from === key || inv.to === key) delete db.invites[id];
  if (!r) return;
  r.members = r.members.filter((k) => k !== key);
  if (!r.members.length) {
    delete db.rooms[r.roomId];
    return;
  }
  const remaining = db.sessions[r.members[0]];
  if (r.status === "waiting") delete r.players[s.player.id];
  if (remaining) {
    r.players[remaining.player.id].isHost = true;
    if (r.status === "in_progress" || r.status === "countdown") {
      r.status = "finished";
      r.winnerId = remaining.player.id;
    }
  }
  broadcast(db, r, { type: "player_left_event", playerId: s.player.id });
}
function finish(r) {
  const ps = Object.values(r.players);
  if (ps.every((p) => p.isFinished)) {
    r.status = "finished";
    r.winnerId = ps[0].score === ps[1].score ? null : ps.sort((a, b) => b.score - a.score)[0].id;
  }
}
function start(db, r, questions, now) {
  let pool = questions.filter((q) => r.category === "all" || q.category === r.category);
  if (r.level && r.level !== "all") {
    const levelPool = pool.filter((q) => (q.level || "B1") === r.level);
    if (levelPool.length >= r.questionCount) pool = levelPool;
  }
  if (pool.length < r.questionCount) pool = questions;
  r.questions = [...pool].sort(() => Math.random() - 0.5).slice(0, r.questionCount);
  if (r.mode === "word") r.questions = r.questions.map((q) => {
    const vi = String(q.vi || "").replace(/[.,!?;:()]/g, "").split(/\s+/).find(Boolean) || q.vi;
    const answer = String(q.answers?.[0] || "").replace(/[.,!?;:()]/g, "").split(/\s+/).find(Boolean) || "";
    return { ...q, vi, hints: `T\u1EEB tr\u1ECDng t\xE2m: ${answer}`, answers: [answer], wordBank: [answer] };
  });
  if (!r.questions.length) throw Error("Ch\u01B0a c\xF3 c\xE2u h\u1ECFi \u0111\u1EC3 \u0111\u1EA5u.");
  r.questionCount = r.questions.length;
  r.status = "countdown";
  r.roundStartedAt = now + 3e3;
  r.firstCorrectAnswers = {};
  r.rematchVotes = {};
  r.winnerId = null;
  for (const key of r.members) {
    const s = db.sessions[key], old = r.players[s.player.id];
    r.players[s.player.id] = { ...participant(s.player, old.isHost), isReady: true };
  }
}
function transition(db, key, cmd, now, questions, identity) {
  for (const [k, s2] of Object.entries(db.sessions)) if (now - s2.seen > LEASE_MS) {
    leave(db, k);
    delete db.sessions[k];
  }
  for (const [id, inv] of Object.entries(db.invites)) if (inv.expiresAt <= now) delete db.invites[id];
  for (const r2 of Object.values(db.rooms)) if (r2.status === "countdown" && now >= r2.roundStartedAt) {
    r2.status = "in_progress";
    broadcast(db, r2, { type: "game_started" });
  }
  if (cmd.type === "register_lobby" && !db.sessions[key]) {
    if (!identity) throw Error("Vui l\xF2ng k\u1EBFt n\u1ED1i l\u1EA1i.");
    if (Object.keys(db.sessions).length >= 200) throw Error("S\u1EA3nh \u0111ang \u0111\u1EA7y. Vui l\xF2ng th\u1EED l\u1EA1i sau.");
    if (Object.values(db.sessions).some((s2) => s2.player.id === identity.id)) throw Error("B\u1EA1n \u0111ang m\u1EDF \u0111\u1EA5u tr\u01B0\u1EDDng \u1EDF tab kh\xE1c. H\xE3y \u0111\xF3ng tab \u0111\xF3 tr\u01B0\u1EDBc.");
    db.sessions[key] = { player: identity, seen: now, events: [], seq: 0, requests: [] };
  }
  const s = db.sessions[key];
  if (!s) throw Error("Phi\xEAn \u0111\u1EA5u \u0111\xE3 h\u1EBFt h\u1EA1n. Vui l\xF2ng k\u1EBFt n\u1ED1i l\u1EA1i.");
  s.seen = now;
  if (cmd.requestId && s.requests.includes(cmd.requestId)) return;
  const emit = (event) => push(s, event);
  const r = s.roomId ? db.rooms[s.roomId] : void 0;
  const p = r?.players[s.player.id];
  const fail = (message) => {
    throw Error(message);
  };
  const count = [5, 10, 15, 20].includes(cmd.questionCount) ? cmd.questionCount : 5;
  const category = typeof cmd.category === "string" ? cmd.category.slice(0, 80) : "all";
  const level = typeof cmd.level === "string" ? cmd.level.slice(0, 10) : "all";
  const mode = cmd.mode === "word" ? "word" : "sentence";
  const join = (room) => {
    if (s.roomId || room.status !== "waiting" || room.members.length >= 2) fail("Ph\xF2ng \u0111\xE3 \u0111\u1EA7y, \u0111\xE3 b\u1EAFt \u0111\u1EA7u ho\u1EB7c b\u1EA1n \u0111ang \u1EDF ph\xF2ng kh\xE1c.");
    delete s.queued;
    s.roomId = room.roomId;
    room.members.push(key);
    room.players[s.player.id] = participant(s.player, room.members.length === 1);
    emit({ type: "joined_success", roomId: room.roomId, playerId: s.player.id, isHost: room.members.length === 1 });
  };
  const create = () => {
    const roomId = `DUEL-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
    const room = { roomId, members: [], players: {}, status: "waiting", questionCount: count, category, level, mode, questions: [], currentRound: 0, roundTimerSeconds: 60, rematchVotes: {} };
    db.rooms[roomId] = room;
    return room;
  };
  switch (cmd.type) {
    case "register_lobby":
    case "poll":
      break;
    case "join_room": {
      if (s.roomId) fail("H\xE3y r\u1EDDi ph\xF2ng hi\u1EC7n t\u1EA1i tr\u01B0\u1EDBc.");
      const room = cmd.roomId ? db.rooms[String(cmd.roomId).trim().toUpperCase()] : create();
      if (!room) fail("Ph\xF2ng kh\xF4ng t\u1ED3n t\u1EA1i ho\u1EB7c \u0111\xE3 \u0111\xF3ng.");
      join(room);
      break;
    }
    case "find_match": {
      if (s.roomId) fail("H\xE3y r\u1EDDi ph\xF2ng hi\u1EC7n t\u1EA1i tr\u01B0\u1EDBc.");
      const other = Object.entries(db.sessions).filter(([k, v]) => k !== key && v.queued && !v.roomId && v.queued.category === category && v.queued.level === level && v.queued.mode === mode).sort((a, b) => a[1].queued.at - b[1].queued.at)[0];
      if (!other) {
        s.queued = { at: now, category, count, level, mode };
        emit({ type: "waiting_in_queue" });
        break;
      }
      const [ok, os] = other;
      const room = create();
      room.category = os.queued.category;
      room.questionCount = os.queued.count;
      room.level = os.queued.level;
      room.mode = os.queued.mode;
      room.members.push(ok);
      room.players[os.player.id] = participant(os.player, true);
      os.roomId = room.roomId;
      delete os.queued;
      push(os, { type: "joined_success", roomId: room.roomId, playerId: os.player.id, isHost: true });
      join(room);
      start(db, room, questions, now);
      broadcast(db, room, { type: "match_found", roomId: room.roomId });
      break;
    }
    case "cancel_find_match":
      delete s.queued;
      emit({ type: "search_cancelled" });
      break;
    case "leave_room":
      leave(db, key);
      break;
    case "send_invite": {
      if (!r || r.status !== "waiting" || r.members.length !== 1) fail("H\xE3y t\u1EA1o ph\xF2ng tr\u1ED1ng tr\u01B0\u1EDBc khi m\u1EDDi.");
      const target = Object.entries(db.sessions).find(([k, v]) => k !== key && (v.player.id === cmd.targetId || cmd.targetEmail && v.player.email === String(cmd.targetEmail).toLowerCase().trim()));
      if (!target || target[1].roomId || target[1].queued) fail("B\u1EA1n n\xE0y \u0111ang b\u1EADn ho\u1EB7c ch\u01B0a v\xE0o s\u1EA3nh. H\xE3y g\u1EEDi link ph\xF2ng.");
      for (const [id, inv] of Object.entries(db.invites)) if (inv.from === key) delete db.invites[id];
      const inviteId = crypto.randomUUID(), expiresAt = now + 6e4;
      db.invites[inviteId] = { from: key, to: target[0], roomId: r.roomId, expiresAt };
      push(target[1], { type: "duel_invitation", inviteId, roomId: r.roomId, fromName: s.player.name, expiresAt });
      emit({ type: "invite_sent" });
      break;
    }
    case "respond_invite": {
      const inv = db.invites[cmd.inviteId];
      if (!inv || inv.to !== key) fail("L\u1EDDi m\u1EDDi \u0111\xE3 h\u1EBFt h\u1EA1n.");
      if (cmd.accept) {
        const room = db.rooms[inv.roomId];
        if (!room || !room.members.includes(inv.from)) fail("Ph\xF2ng kh\xF4ng c\xF2n kh\u1EA3 d\u1EE5ng.");
        join(room);
      } else if (db.sessions[inv.from]) push(db.sessions[inv.from], { type: "invite_declined" });
      delete db.invites[cmd.inviteId];
      break;
    }
    case "toggle_ready":
      if (r?.status === "waiting" && p) p.isReady = !p.isReady;
      break;
    case "update_room_settings":
      if (r?.status === "waiting" && p?.isHost) {
        r.questionCount = count;
        r.category = category;
        r.level = level;
        r.mode = mode;
      }
      break;
    case "start_game":
      if (!r || !p?.isHost || r.status !== "waiting" || r.members.length !== 2 || !Object.values(r.players).every((v) => v.isReady)) fail("C\u1EA7n \u0111\u1EE7 hai ng\u01B0\u1EDDi s\u1EB5n s\xE0ng v\xE0 ch\u1EE7 ph\xF2ng b\u1EAFt \u0111\u1EA7u.");
      start(db, r, questions, now);
      break;
    case "submit_answer":
    case "skip_question": {
      if (!r || r.status !== "in_progress" || !p || p.isFinished) fail("Tr\u1EADn ch\u01B0a b\u1EAFt \u0111\u1EA7u ho\u1EB7c b\u1EA1n \u0111\xE3 ho\xE0n t\u1EA5t.");
      const index = p.currentQuestionIndex;
      if (cmd.questionIndex !== index) fail("C\xE2u h\u1ECFi \u0111\xE3 thay \u0111\u1ED5i. H\xE3y th\u1EED l\u1EA1i.");
      const q = r.questions[index];
      if (cmd.type === "submit_answer") {
        if (typeof cmd.answer !== "string" || cmd.answer.length > 2e3) fail("C\xE2u tr\u1EA3 l\u1EDDi kh\xF4ng h\u1EE3p l\u1EC7.");
        const correct = q.answers.some((a) => norm(a) === norm(cmd.answer));
        if (!correct) {
          emit({ type: "answer_result", correct: false, message: "B\u1EA3n d\u1ECBch ch\u01B0a \u0111\xFAng. H\xE3y th\u1EED l\u1EA1i!" });
          break;
        }
        const isFirst = !r.firstCorrectAnswers[index], pointsEarned = isFirst ? 150 : 100;
        if (isFirst) r.firstCorrectAnswers[index] = s.player.id;
        p.score += pointsEarned;
        emit({ type: "answer_result", correct: true, pointsEarned, isFirst, questionIndex: index });
        broadcast(db, r, { type: "opponent_scored", playerName: p.name, questionIndex: index, isFirst }, key);
      }
      p.currentQuestionIndex++;
      p.answeredCount++;
      p.isFinished = p.currentQuestionIndex >= r.questions.length;
      finish(r);
      break;
    }
    case "request_rematch":
      if (!r || r.status !== "finished" || r.members.length !== 2) fail("C\u1EA7n \u0111\u1EE7 hai ng\u01B0\u1EDDi \u0111\u1EC3 t\xE1i \u0111\u1EA5u.");
      r.rematchVotes[s.player.id] = true;
      if (r.members.every((k) => r.rematchVotes[db.sessions[k].player.id])) start(db, r, questions, now);
      else broadcast(db, r, { type: "rematch_requested_by_player" }, key);
      break;
    case "send_emote":
      if (r && ["\u{1F525}", "\u26A1", "\u{1F60E}", "\u{1F631}", "\u{1F44F}", "\u{1F3C6}", "\u{1F4AA}", "\u2694\uFE0F"].includes(cmd.emote)) broadcast(db, r, { type: "emote_received", senderName: s.player.name, emote: cmd.emote }, key);
      break;
    case "typing":
      break;
    // Do not write every keystroke to shared storage.
    default:
      fail("Thao t\xE1c kh\xF4ng \u0111\u01B0\u1EE3c h\u1ED7 tr\u1EE3.");
  }
  if (cmd.requestId) {
    s.requests.push(cmd.requestId);
    s.requests = s.requests.slice(-100);
  }
}
function snapshot(db, key, cursor, now) {
  const s = db.sessions[key];
  if (!s) throw Error("Phi\xEAn \u0111\u1EA5u \u0111\xE3 h\u1EBFt h\u1EA1n.");
  const room = s.roomId ? db.rooms[s.roomId] : null;
  const { members, firstCorrectAnswers, ...state } = room || {};
  return {
    events: s.events.filter((e) => e.eventId > cursor),
    cursor: s.seq,
    playerId: s.player.id,
    queued: !!s.queued,
    state: room ? state : null,
    serverNow: now,
    players: Object.values(db.sessions).filter((v) => !v.roomId && v.player.id !== s.player.id).map((v) => ({ id: v.player.id, full_name: v.player.name, avatar_url: v.player.avatar_url }))
  };
}
function installDurableDuel(app2, admin, questions) {
  app2.post("/api/duel/sync", async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    if (!admin) return res.status(503).json({ error: "M\xE1y ch\u1EE7 ch\u01B0a c\u1EA5u h\xECnh Supabase cho \u0111\u1EA5u 1vs1." });
    const { sessionToken, command: cmd, cursor = 0 } = req.body || {};
    if (typeof sessionToken !== "string" || !/^[a-f0-9]{64}$/.test(sessionToken) || !cmd || typeof cmd.type !== "string" || JSON.stringify(cmd).length > 5e3) return res.status(400).json({ error: "Y\xEAu c\u1EA7u kh\xF4ng h\u1EE3p l\u1EC7." });
    const key = crypto.createHash("sha256").update(sessionToken).digest("hex");
    let identity;
    try {
      if (cmd.type === "register_lobby") {
        const bearer = req.headers.authorization?.replace(/^Bearer /, "");
        if (!bearer) return res.status(401).json({ error: "B\u1EA1n c\u1EA7n \u0111\u0103ng nh\u1EADp l\u1EA1i \u0111\u1EC3 v\xE0o \u0111\u1EA5u tr\u01B0\u1EDDng." });
        const { data, error } = await admin.auth.getUser(bearer);
        if (error || !data.user) return res.status(401).json({ error: "Phi\xEAn \u0111\u0103ng nh\u1EADp \u0111\xE3 h\u1EBFt h\u1EA1n. H\xE3y \u0111\u0103ng nh\u1EADp l\u1EA1i." });
        const user = data.user;
        const { data: profile, error: profileError } = await admin.from("profiles").select("full_name,email,avatar_url").eq("id", user.id).maybeSingle();
        if (profileError) return res.status(503).json({ error: "Kh\xF4ng t\u1EA3i \u0111\u01B0\u1EE3c h\u1ED3 s\u01A1 ng\u01B0\u1EDDi ch\u01A1i. H\xE3y th\u1EED k\u1EBFt n\u1ED1i l\u1EA1i." });
        const metadata = user.user_metadata || {};
        identity = {
          id: user.id,
          name: profile?.full_name || metadata.full_name || metadata.name || user.email?.split("@")[0] || "H\u1ECDc vi\xEAn",
          avatar_url: profile?.avatar_url || metadata.avatar_url,
          email: user.email || profile?.email
        };
      }
      for (let attempt = 0; attempt < 10; attempt++) {
        const { data: row, error } = await admin.from("duel_state_store").select("version,state").eq("id", 1).single();
        if (error) return res.status(503).json({ error: "Kho \u0111\u1EA5u 1vs1 ch\u01B0a \u0111\u01B0\u1EE3c c\xE0i \u0111\u1EB7t. H\xE3y ch\u1EA1y migration 20261015093000_durable_duel_store.sql trong Supabase." });
        const db = row.state, now = Date.now();
        transition(db, key, cmd, now, questions(), identity);
        const { data: committed, error: writeError } = await admin.rpc("duel_compare_and_swap", { expected_version: row.version, next_state: db });
        if (writeError) return res.status(503).json({ error: "Kh\xF4ng l\u01B0u \u0111\u01B0\u1EE3c tr\u1EA1ng th\xE1i tr\u1EADn. H\xE3y ki\u1EC3m tra migration v\xE0 c\u1EA5u h\xECnh Supabase service role." });
        if (committed) return res.json(snapshot(db, key, Number(cursor) || 0, now));
        await new Promise((resolve) => setTimeout(resolve, 15 + Math.random() * 50));
      }
      return res.status(503).json({ error: "M\xE1y ch\u1EE7 \u0111ang b\u1EADn. Vui l\xF2ng th\u1EED l\u1EA1i." });
    } catch (error) {
      const message = error.message || "Kh\xF4ng x\u1EED l\xFD \u0111\u01B0\u1EE3c tr\u1EADn \u0111\u1EA5u.";
      return res.status(/duel_state_store|duel_compare_and_swap|schema cache|does not exist/i.test(message) ? 503 : 400).json({ error: message });
    }
  });
}

// src/lib/kidsLearning.ts
var KIDS_WORDS = [
  { word: "cat", meaning: "Con m\xE8o", picture: "\u{1F431}", grades: [1, 2] },
  { word: "dog", meaning: "Con ch\xF3", picture: "\u{1F436}", grades: [1, 2] },
  { word: "bird", meaning: "Con chim", picture: "\u{1F426}", grades: [1, 2] },
  { word: "fish", meaning: "Con c\xE1", picture: "\u{1F41F}", grades: [1, 2] },
  { word: "rabbit", meaning: "Con th\u1ECF", picture: "\u{1F430}", grades: [1, 2, 3] },
  { word: "lion", meaning: "S\u01B0 t\u1EED", picture: "\u{1F981}", grades: [2, 3, 4] },
  { word: "elephant", meaning: "Con voi", picture: "\u{1F418}", grades: [2, 3, 4] },
  { word: "butterfly", meaning: "Con b\u01B0\u1EDBm", picture: "\u{1F98B}", grades: [2, 3, 4] },
  { word: "apple", meaning: "Qu\u1EA3 t\xE1o", picture: "\u{1F34E}", grades: [1, 2] },
  { word: "banana", meaning: "Qu\u1EA3 chu\u1ED1i", picture: "\u{1F34C}", grades: [1, 2] },
  { word: "orange", meaning: "Qu\u1EA3 cam", picture: "\u{1F34A}", grades: [1, 2, 3] },
  { word: "carrot", meaning: "C\u1EE7 c\xE0 r\u1ED1t", picture: "\u{1F955}", grades: [1, 2, 3] },
  { word: "cake", meaning: "B\xE1nh ng\u1ECDt", picture: "\u{1F382}", grades: [1, 2, 3] },
  { word: "car", meaning: "\xD4 t\xF4", picture: "\u{1F697}", grades: [1, 2] },
  { word: "bus", meaning: "Xe bu\xFDt", picture: "\u{1F68C}", grades: [1, 2, 3] },
  { word: "bicycle", meaning: "Xe \u0111\u1EA1p", picture: "\u{1F6B2}", grades: [2, 3, 4] },
  { word: "airplane", meaning: "M\xE1y bay", picture: "\u2708\uFE0F", grades: [2, 3, 4] },
  { word: "school", meaning: "Tr\u01B0\u1EDDng h\u1ECDc", picture: "\u{1F3EB}", grades: [1, 2, 3] },
  { word: "book", meaning: "Quy\u1EC3n s\xE1ch", picture: "\u{1F4D6}", grades: [1, 2, 3] },
  { word: "pencil", meaning: "B\xFAt ch\xEC", picture: "\u270F\uFE0F", grades: [1, 2, 3] },
  { word: "sun", meaning: "M\u1EB7t tr\u1EDDi", picture: "\u2600\uFE0F", grades: [1, 2, 3] },
  { word: "moon", meaning: "M\u1EB7t tr\u0103ng", picture: "\u{1F319}", grades: [1, 2, 3] },
  { word: "rainbow", meaning: "C\u1EA7u v\u1ED3ng", picture: "\u{1F308}", grades: [2, 3, 4] },
  { word: "flower", meaning: "B\xF4ng hoa", picture: "\u{1F33B}", grades: [1, 2, 3] },
  { word: "mountain", meaning: "N\xFAi", picture: "\u26F0\uFE0F", grades: [3, 4, 5] },
  { word: "river", meaning: "Con s\xF4ng", picture: "\u{1F30A}", grades: [3, 4, 5] },
  { word: "doctor", meaning: "B\xE1c s\u0129", picture: "\u{1F9D1}\u200D\u2695\uFE0F", grades: [3, 4, 5] },
  { word: "teacher", meaning: "Gi\xE1o vi\xEAn", picture: "\u{1F9D1}\u200D\u{1F3EB}", grades: [1, 2, 3] },
  { word: "friend", meaning: "B\u1EA1n b\xE8", picture: "\u{1F9D1}\u200D\u{1F91D}\u200D\u{1F9D1}", grades: [2, 3, 4] },
  { word: "happy", meaning: "Vui v\u1EBB", picture: "\u{1F60A}", grades: [3, 4, 5] },
  { word: "strong", meaning: "M\u1EA1nh m\u1EBD", picture: "\u{1F4AA}", grades: [4, 5, 6] },
  { word: "planet", meaning: "H\xE0nh tinh", picture: "\u{1FA90}", grades: [4, 5, 6] },
  { word: "rocket", meaning: "T\xEAn l\u1EEDa", picture: "\u{1F680}", grades: [4, 5, 6] },
  { word: "computer", meaning: "M\xE1y t\xEDnh", picture: "\u{1F4BB}", grades: [4, 5, 6] },
  { word: "library", meaning: "Th\u01B0 vi\u1EC7n", picture: "\u{1F4DA}", grades: [4, 5, 6] },
  { word: "future", meaning: "T\u01B0\u01A1ng lai", picture: "\u{1F52E}", grades: [5, 6] },
  { word: "adventure", meaning: "Cu\u1ED9c phi\xEAu l\u01B0u", picture: "\u{1F5FA}\uFE0F", grades: [5, 6] }
];

// server.ts
dotenv.config();
var app = express();
var httpServer = http.createServer(app);
var PORT = Number(process.env.PORT) || 3e3;
app.use(express.json());
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  if (process.env.VERCEL && !req.url.startsWith("/api") && !req.url.startsWith("/index.html") && req.url !== "/") {
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
installDurableDuel(app, supabaseAdmin, () => memoryQuestionsStore);
var memoryQuestionsStore = [...INITIAL_QUESTIONS, ...SPECIALIZED_QUESTIONS].map((q, i) => ({
  id: q.id || i + 1,
  vi: q.vi,
  hints: q.hints,
  answers: q.answers,
  category: q.category || "general",
  level: q.level || "B1",
  created_date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0]
}));
var SETTINGS_FILE = path.join(process.cwd(), "app-settings.json");
var appSettings = {
  appName: "D\u1ECBch M\u1ED7i Ng\xE0y",
  appSubtitle: "D\u1ECBch c\xE2u m\u1ED7i ng\xE0y k\xE8m t\u1EEB v\u1EF1ng g\u1EE3i \xFD",
  appIcon: "\u{1F3AF}",
  appIconType: "emoji",
  themeColor: "indigo",
  bgTheme: "default",
  showAnnouncement: true,
  announcementText: "\u{1F525} Khuy\u1EBFn m\xE3i VIP Tr\u1ECDn \u0110\u1EDDi: M\u1EDF kh\xF3a to\xE0n b\u1ED9 chuy\xEAn ng\xE0nh IT, Kinh Doanh & Du L\u1ECBch!",
  announcementType: "vip",
  announcementLinkText: "N\xE2ng c\u1EA5p VIP",
  heroGreeting: "Luy\u1EC7n d\u1ECBch m\u1ED7i ng\xE0y \u0111\u1EC3 ph\u1EA3n x\u1EA1 ti\u1EBFng Anh t\u1EF1 nhi\xEAn",
  heroSubtext: "H\u1ECDc d\u1ECBch t\u1EEBng c\xE2u, tra t\u1EEB v\u1EF1ng th\xF4ng minh v\xE0 thi \u0111\u1EA5u Boss ti\u1EBFng Anh",
  contactPhone: "0987.654.321",
  contactZalo: "https://zalo.me/0987654321",
  contactEmail: "hungpv2172002@gmail.com",
  contactFacebook: "https://facebook.com",
  contactTiktok: "https://tiktok.com",
  contactTelegram: ""
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
  console.warn("Kh\xF4ng th\u1EC3 \u0111\u1ECDc file app-settings.json:", e);
}
function getDailyRotatedQuestions(allQuestions, dateStr) {
  if (!allQuestions || allQuestions.length === 0) return [];
  const today2 = dateStr || (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  let seed = 0;
  for (let i = 0; i < today2.length; i++) {
    seed = (seed << 5) - seed + today2.charCodeAt(i);
    seed |= 0;
  }
  seed = Math.abs(seed) || 12345;
  const random = () => {
    let t = seed += 1831565813;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
  const todayQuestions = allQuestions.filter((q) => q.created_date === today2);
  const otherQuestions = allQuestions.filter((q) => q.created_date !== today2);
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
var KIDS_WORD_TOPICS = {
  animals: "\u0111\u1ED9ng v\u1EADt quen thu\u1ED9c",
  food: "\u0111\u1ED3 \u0103n, th\u1EE9c u\u1ED1ng v\xE0 nguy\xEAn li\u1EC7u quen thu\u1ED9c",
  school: "tr\u01B0\u1EDDng h\u1ECDc v\xE0 \u0111\u1ED3 d\xF9ng h\u1ECDc t\u1EADp",
  home: "nh\xE0 c\u1EEDa v\xE0 \u0111\u1ED3 v\u1EADt trong gia \u0111\xECnh",
  nature: "thi\xEAn nhi\xEAn v\xE0 th\u1EDDi ti\u1EBFt",
  transport: "ph\u01B0\u01A1ng ti\u1EC7n giao th\xF4ng",
  sports: "th\u1EC3 thao v\xE0 ho\u1EA1t \u0111\u1ED9ng vui ch\u01A1i",
  body: "c\u01A1 th\u1EC3 v\xE0 s\u1EE9c kh\u1ECFe c\u01A1 b\u1EA3n",
  clothes: "qu\u1EA7n \xE1o v\xE0 v\u1EADt d\u1EE5ng c\xE1 nh\xE2n",
  colors: "m\xE0u s\u1EAFc, h\xECnh d\u1EA1ng v\xE0 k\xEDch th\u01B0\u1EDBc",
  daily: "\u0111\u1ED9ng t\u1EEB v\xE0 ho\u1EA1t \u0111\u1ED9ng h\u1EB1ng ng\xE0y",
  science: "khoa h\u1ECDc v\xE0 v\u0169 tr\u1EE5 \u1EDF m\u1EE9c thi\u1EBFu nhi"
};
function kidsWordKey(word) {
  return word.trim().toLowerCase().replace(/\s+/g, " ");
}
function sanitizeKidsWord(value, grades) {
  if (!value || typeof value !== "object") return null;
  if (!Array.isArray(grades)) return null;
  const word = typeof value.word === "string" ? value.word.trim().replace(/\s+/g, " ").toLowerCase() : "";
  const meaning = typeof value.meaning === "string" ? value.meaning.trim() : "";
  const picture = typeof value.picture === "string" ? value.picture.trim() : "";
  if (!/^[a-z]+(?:[ '-][a-z]+){0,3}$/.test(word) || word.length > 48) return null;
  if (!meaning || meaning.length > 120 || !picture || Array.from(picture).length > 12) return null;
  if (!/[\p{Extended_Pictographic}]/u.test(picture)) return null;
  const validGrades = Array.from(new Set(grades.map(Number).filter((grade) => Number.isInteger(grade) && grade >= 1 && grade <= 6)));
  if (!validGrades.length) return null;
  return { word, word_key: kidsWordKey(word), meaning, picture, grades: validGrades };
}
async function authorizeKidsWordAdmin(req, res) {
  if (!supabaseAdmin) {
    res.status(503).json({ error: "M\xE1y ch\u1EE7 ch\u01B0a c\u1EA5u h\xECnh Supabase service role." });
    return null;
  }
  const match = typeof req.headers.authorization === "string" ? req.headers.authorization.match(/^Bearer\s+(.+)$/i) : null;
  const accessToken = match?.[1]?.trim();
  if (!accessToken) {
    res.status(401).json({ error: "Vui l\xF2ng \u0111\u0103ng nh\u1EADp t\xE0i kho\u1EA3n qu\u1EA3n tr\u1ECB vi\xEAn." });
    return null;
  }
  const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(accessToken);
  if (authError || !authData.user) {
    res.status(401).json({ error: "Phi\xEAn \u0111\u0103ng nh\u1EADp kh\xF4ng h\u1EE3p l\u1EC7 ho\u1EB7c \u0111\xE3 h\u1EBFt h\u1EA1n." });
    return null;
  }
  const { data: profile, error: profileError } = await supabaseAdmin.from("profiles").select("role").eq("id", authData.user.id).maybeSingle();
  if (profileError) {
    res.status(503).json({ error: "Kh\xF4ng x\xE1c minh \u0111\u01B0\u1EE3c quy\u1EC1n qu\u1EA3n tr\u1ECB. Vui l\xF2ng th\u1EED l\u1EA1i." });
    return null;
  }
  if (profile?.role !== "admin") {
    res.status(403).json({ error: "Ch\u1EC9 t\xE0i kho\u1EA3n qu\u1EA3n tr\u1ECB vi\xEAn m\u1EDBi \u0111\u01B0\u1EE3c qu\u1EA3n l\xFD t\u1EEB tr\u1EBB em." });
    return null;
  }
  return authData.user;
}
async function loadKidsWordKeys() {
  if (!supabaseAdmin) throw new Error("M\xE1y ch\u1EE7 ch\u01B0a c\u1EA5u h\xECnh Supabase service role.");
  const keys = new Set(KIDS_WORDS.map((word) => kidsWordKey(word.word)));
  for (let offset = 0; ; offset += 1e3) {
    const { data, error } = await supabaseAdmin.from("kids_words").select("word_key").order("word_key", { ascending: true }).range(offset, offset + 999);
    if (error) throw error;
    (data || []).forEach((row) => keys.add(row.word_key));
    if (!data || data.length < 1e3) break;
  }
  return keys;
}
app.get(["/api/kids/words", "/kids/words"], async (_req, res) => {
  if (!supabaseAdmin) return res.json({ success: true, data: [] });
  const words = [];
  try {
    for (let offset = 0; ; offset += 1e3) {
      const { data, error } = await supabaseAdmin.from("kids_words").select("word, meaning, picture, grades").eq("is_active", true).order("word", { ascending: true }).range(offset, offset + 999);
      if (error) {
        console.warn("[Kids words] Could not load published words:", error.message);
        return res.status(503).json({ error: "Ch\u01B0a t\u1EA3i \u0111\u01B0\u1EE3c kho t\u1EEB tr\u1EBB em. H\xE3y ki\u1EC3m tra migration Supabase." });
      }
      words.push(...data || []);
      if (!data || data.length < 1e3) break;
    }
  } catch (error) {
    console.warn("[Kids words] Could not load published words:", error.message);
    return res.status(503).json({ error: "Ch\u01B0a t\u1EA3i \u0111\u01B0\u1EE3c kho t\u1EEB tr\u1EBB em. H\xE3y th\u1EED l\u1EA1i sau." });
  }
  return res.json({ success: true, data: words });
});
app.post(["/api/admin/kids-words/generate", "/admin/kids-words/generate"], async (req, res) => {
  try {
    const admin = await authorizeKidsWordAdmin(req, res);
    if (!admin) return;
    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({ error: "M\xE1y ch\u1EE7 ch\u01B0a c\u1EA5u h\xECnh GEMINI_API_KEY." });
    }
    const grade = Number(req.body?.grade);
    const count = Number(req.body?.count);
    const topic = typeof req.body?.topic === "string" ? req.body.topic : "";
    if (!Number.isInteger(grade) || grade < 1 || grade > 6) {
      return res.status(400).json({ error: "L\u1EDBp h\u1ECDc ph\u1EA3i t\u1EEB l\u1EDBp 1 \u0111\u1EBFn l\u1EDBp 6." });
    }
    if (!Number.isInteger(count) || count < 1 || count > 20) {
      return res.status(400).json({ error: "M\u1ED7i l\u1EA7n ch\u1EC9 t\u1EA1o t\u1EEB 1 \u0111\u1EBFn 20 t\u1EEB." });
    }
    if (!KIDS_WORD_TOPICS[topic]) {
      return res.status(400).json({ error: "Ch\u1EE7 \u0111\u1EC1 t\u1EEB v\u1EF1ng kh\xF4ng h\u1EE3p l\u1EC7." });
    }
    let existingKeys;
    try {
      existingKeys = await loadKidsWordKeys();
    } catch (error) {
      console.warn("[Kids words] Could not check duplicates:", error.message);
      return res.status(503).json({ error: "Ch\u01B0a c\xF3 b\u1EA3ng kids_words. H\xE3y ch\u1EA1y migration Supabase tr\u01B0\u1EDBc khi t\u1EA1o t\u1EEB." });
    }
    const prompt = `B\u1EA1n l\xE0 gi\xE1o vi\xEAn ti\u1EBFng Anh ti\u1EC3u h\u1ECDc Vi\u1EC7t Nam, chuy\xEAn so\u1EA1n t\u1EEB v\u1EF1ng ch\xEDnh x\xE1c cho h\u1ECDc sinh l\u1EDBp ${grade}.
H\xE3y t\u1EA1o \u0111\xFAng ${count} m\u1EE5c t\u1EEB thu\u1ED9c ch\u1EE7 \u0111\u1EC1 ${KIDS_WORD_TOPICS[topic]}.
M\u1ED7i m\u1EE5c ch\u1EC9 l\xE0 m\u1ED9t t\u1EEB ti\u1EBFng Anh ph\u1ED5 bi\u1EBFn ho\u1EB7c c\u1EE5m t\u1EEB ng\u1EAFn t\u1ED1i \u0111a 4 t\u1EEB, kh\xF4ng ph\u1EA3i c\xE2u, kh\xF4ng d\xF9ng t\u1EEB hi\u1EBFm, t\xEAn ri\xEAng, t\u1EEB g\xE2y s\u1EE3 h\xE3i ho\u1EB7c n\u1ED9i dung ng\u01B0\u1EDDi l\u1EDBn. \u01AFu ti\xEAn v\u1EADt/con v\u1EADt/\u0111\u1ED3 \u0103n/ho\u1EA1t \u0111\u1ED9ng c\u1EE5 th\u1EC3, ph\xF9 h\u1EE3p tu\u1ED5i v\xE0 c\xF3 th\u1EC3 minh h\u1ECDa r\xF5 b\u1EB1ng m\u1ED9t emoji.
V\u1EDBi m\u1ED7i m\u1EE5c: word l\xE0 t\u1EEB ti\u1EBFng Anh vi\u1EBFt th\u01B0\u1EDDng; meaning l\xE0 ngh\u0129a ti\u1EBFng Vi\u1EC7t ng\u1EAFn, \u0111\xFAng v\xE0 t\u1EF1 nhi\xEAn; picture l\xE0 \u0111\xFAng m\u1ED9t emoji minh h\u1ECDa tr\u1EF1c ti\u1EBFp, kh\xF4ng d\xF9ng \u0111\u01B0\u1EDDng d\u1EABn \u1EA3nh. Tr\xE1nh c\xE1c t\u1EEB \u0111\u1ED3ng ngh\u0129a tr\xF9ng nhau v\xE0 kh\xF4ng t\u1EA1o s\u1ED1 nhi\u1EC1u n\u1EBFu d\u1EA1ng s\u1ED1 \xEDt l\xE0 m\u1EE5c t\u1EEB chu\u1EA9n. Kh\xF4ng th\xEAm gi\u1EA3i th\xEDch ngo\xE0i JSON.`;
    const models = ["gemini-3.1-flash-lite", "gemini-flash-latest", "gemini-3.1-pro-preview"];
    let candidates = [];
    let successfulModel = "";
    let lastError = null;
    for (const model of models) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            temperature: 0.35,
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  word: { type: Type.STRING },
                  meaning: { type: Type.STRING },
                  picture: { type: Type.STRING }
                },
                required: ["word", "meaning", "picture"]
              }
            }
          }
        });
        const parsed = JSON.parse(response.text || "[]");
        if (!Array.isArray(parsed)) throw new Error("AI tr\u1EA3 v\u1EC1 d\u1EEF li\u1EC7u kh\xF4ng \u0111\xFAng \u0111\u1ECBnh d\u1EA1ng.");
        const seen = /* @__PURE__ */ new Set();
        candidates = parsed.map((value) => sanitizeKidsWord(value, [grade])).filter((value) => {
          if (!value || existingKeys.has(value.word_key) || seen.has(value.word_key)) return false;
          seen.add(value.word_key);
          return true;
        }).slice(0, count);
        successfulModel = model;
        break;
      } catch (error) {
        lastError = error;
      }
    }
    if (!successfulModel) {
      console.error("[Kids words] AI generation failed:", lastError?.message);
      return res.status(502).json({ error: "AI ch\u01B0a t\u1EA1o \u0111\u01B0\u1EE3c danh s\xE1ch h\u1EE3p l\u1EC7. Vui l\xF2ng th\u1EED l\u1EA1i." });
    }
    return res.json({
      success: true,
      modelUsed: successfulModel,
      requestedCount: count,
      duplicateCount: Math.max(0, count - candidates.length),
      data: candidates.map(({ word, meaning, picture }) => ({ word, meaning, picture, grades: [grade] }))
    });
  } catch (error) {
    console.error("[Kids words] Generation route failed:", error);
    return res.status(500).json({ error: error.message || "L\u1ED7i khi t\u1EA1o t\u1EEB v\u1EF1ng." });
  }
});
app.post(["/api/admin/kids-words", "/admin/kids-words"], async (req, res) => {
  try {
    const admin = await authorizeKidsWordAdmin(req, res);
    if (!admin) return;
    if (!Array.isArray(req.body?.words) || req.body.words.length < 1 || req.body.words.length > 50) {
      return res.status(400).json({ error: "H\xE3y ch\u1ECDn t\u1EEB \u0111\u1EC3 l\u01B0u (t\u1ED1i \u0111a 50 t\u1EEB m\u1ED7i l\u1EA7n)." });
    }
    const words = req.body.words.map((value) => sanitizeKidsWord(value, value?.grades || [])).filter((value) => value);
    if (!words.length || words.length !== req.body.words.length) {
      return res.status(400).json({ error: "M\u1ED9t s\u1ED1 m\u1EE5c t\u1EEB thi\u1EBFu t\u1EEB ti\u1EBFng Anh, ngh\u0129a, emoji ho\u1EB7c l\u1EDBp h\u1EE3p l\u1EC7." });
    }
    let existingKeys;
    try {
      existingKeys = await loadKidsWordKeys();
    } catch (error2) {
      console.warn("[Kids words] Could not check duplicates before save:", error2.message);
      return res.status(503).json({ error: "Ch\u01B0a c\xF3 b\u1EA3ng kids_words. H\xE3y ch\u1EA1y migration Supabase tr\u01B0\u1EDBc khi l\u01B0u t\u1EEB." });
    }
    const uniqueWords = words.filter((word) => !existingKeys.has(word.word_key));
    if (!uniqueWords.length) {
      return res.json({ success: true, savedCount: 0, duplicateCount: words.length });
    }
    const rows = uniqueWords.map((word) => ({ ...word, created_by: admin.id, is_active: true }));
    const { data, error } = await supabaseAdmin.from("kids_words").upsert(rows, { onConflict: "word_key", ignoreDuplicates: true }).select("word, meaning, picture, grades");
    if (error) {
      console.error("[Kids words] Could not save words:", error.message);
      return res.status(503).json({ error: "Kh\xF4ng l\u01B0u \u0111\u01B0\u1EE3c t\u1EEB. H\xE3y ki\u1EC3m tra migration Supabase v\xE0 th\u1EED l\u1EA1i." });
    }
    const savedCount = data?.length || 0;
    return res.json({ success: true, savedCount, duplicateCount: words.length - savedCount, data: data || [] });
  } catch (error) {
    console.error("[Kids words] Save route failed:", error);
    return res.status(500).json({ error: error.message || "L\u1ED7i khi l\u01B0u t\u1EEB v\u1EF1ng." });
  }
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
    if (!supabaseAdmin) {
      return res.status(503).json({
        error: "Ch\u01B0a c\u1EA5u h\xECnh Supabase Service Role Key. C\xE2u h\u1ECFi kh\xF4ng th\u1EC3 \u0111\u01B0\u1EE3c l\u01B0u b\u1EC1n v\u1EEFng."
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
      const matchingPool = [...INITIAL_QUESTIONS, ...SPECIALIZED_QUESTIONS].filter(
        (q) => (q.category || "general") === requestedCategory
      );
      const poolToUse = matchingPool.length > 0 ? matchingPool : [...INITIAL_QUESTIONS, ...SPECIALIZED_QUESTIONS];
      const shuffled = [...poolToUse].sort(() => Math.random() - 0.5);
      questionsData = shuffled.slice(0, 10).map((item) => ({
        vi: item.vi,
        hints: item.hints,
        answers: item.answers,
        category: requestedCategory
      }));
    }
    const today2 = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const records = questionsData.map((q) => ({
      vi: q.vi,
      hints: q.hints,
      answers: Array.isArray(q.answers) ? q.answers : [q.answers],
      created_date: today2,
      category: requestedCategory
    }));
    let insertedData = null;
    try {
      const { data, error } = await supabaseAdmin.from("questions").insert(records).select();
      if (error) {
        console.warn("L\u01B0u v\xE0o Supabase th\u1EA5t b\u1EA1i:", error.message);
        const isMissingCategory = error.message?.includes("category") && (error.message?.includes("schema cache") || error.message?.includes("does not exist") || error.code === "PGRST204");
        return res.status(503).json({
          error: isMissingCategory ? "C\u01A1 s\u1EDF d\u1EEF li\u1EC7u ch\u01B0a c\xF3 c\u1ED9t category. H\xE3y ch\u1EA1y migration adult_question_categories tr\xEAn Supabase." : "Kh\xF4ng l\u01B0u \u0111\u01B0\u1EE3c c\xE2u h\u1ECFi v\xE0o Supabase. C\xE2u m\u1EDBi ch\u01B0a \u0111\u01B0\u1EE3c th\xEAm v\xE0o ng\xE2n h\xE0ng.",
          supabaseWarning: error.message
        });
      }
      if (!data || data.length !== records.length) {
        return res.status(503).json({
          error: "Supabase ch\u01B0a x\xE1c nh\u1EADn l\u01B0u \u0111\u1EE7 c\xE2u h\u1ECFi. Vui l\xF2ng th\u1EED l\u1EA1i."
        });
      }
      insertedData = data;
    } catch (dbEx) {
      console.warn("Ngo\u1EA1i l\u1EC7 khi g\u1ECDi Supabase:", dbEx.message);
      return res.status(503).json({
        error: "Kh\xF4ng k\u1EBFt n\u1ED1i \u0111\u01B0\u1EE3c Supabase. C\xE2u m\u1EDBi ch\u01B0a \u0111\u01B0\u1EE3c th\xEAm v\xE0o ng\xE2n h\xE0ng.",
        supabaseWarning: dbEx.message
      });
    }
    memoryQuestionsStore = [...insertedData, ...memoryQuestionsStore];
    return res.json({
      success: true,
      message: isCuratedFallback ? `\u0110\xE3 n\u1EA1p ${records.length} c\xE2u h\u1ECFi giao ti\u1EBFp chu\u1EA9n ch\u1ECDn l\u1ECDc.` : `\u0110\xE3 sinh th\xE0nh c\xF4ng ${records.length} c\xE2u h\u1ECFi m\u1EDBi b\u1EB1ng Gemini AI (${successfulModel})!`,
      count: records.length,
      modelUsed: successfulModel || "curated_database",
      isCuratedFallback,
      insertedToSupabase: true,
      data: insertedData
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
  const missingQuestions = [...INITIAL_QUESTIONS, ...SPECIALIZED_QUESTIONS].filter((q) => !existingIds.has(q.id));
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
      const { data: dbData } = await supabaseAdmin.from("app_settings").select("value").eq("id", "default").maybeSingle();
      if (dbData?.value && typeof dbData.value === "object") {
        appSettings = { ...appSettings, ...dbData.value };
      }
    } catch (e) {
    }
  }
  return res.json({
    success: true,
    settings: appSettings
  });
});
app.post(["/api/settings", "/settings"], async (req, res) => {
  try {
    const payload = req.body || {};
    for (const key of Object.keys(payload)) {
      if (payload[key] !== void 0) {
        appSettings[key] = payload[key];
      }
    }
    try {
      fs.writeFileSync(SETTINGS_FILE, JSON.stringify(appSettings, null, 2), "utf-8");
    } catch (e) {
      try {
        fs.writeFileSync("/tmp/app-settings.json", JSON.stringify(appSettings, null, 2), "utf-8");
      } catch (e2) {
      }
    }
    if (supabaseAdmin) {
      try {
        await supabaseAdmin.from("app_settings").upsert({
          id: "default",
          value: appSettings,
          updated_at: (/* @__PURE__ */ new Date()).toISOString()
        });
      } catch (dbErr) {
        console.warn("L\u1ED7i l\u01B0u app_settings v\xE0o Supabase:", dbErr);
      }
    }
    return res.json({
      success: true,
      message: "\u0110\xE3 l\u01B0u thay \u0111\u1ED5i c\xE0i \u0111\u1EB7t \u1EE9ng d\u1EE5ng th\xE0nh c\xF4ng!",
      settings: appSettings
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});
app.post(["/api/lookup-word", "/lookup-word"], async (req, res) => {
  try {
    const { word, contextSentence, category } = req.body || {};
    if (!word || typeof word !== "string" || !word.trim()) {
      return res.status(400).json({
        success: false,
        error: "Vui l\xF2ng cung c\u1EA5p t\u1EEB ho\u1EB7c c\u1EE5m t\u1EEB b\u1EA1n mu\u1ED1n tra."
      });
    }
    const cleanWord = word.trim();
    const cleanContext = typeof contextSentence === "string" ? contextSentence.trim() : "";
    const cleanCategory = typeof category === "string" ? category.trim() : "general";
    const googleTranslateUrl = `https://translate.google.com/?sl=auto&tl=en&text=${encodeURIComponent(
      cleanWord
    )}&op=translate`;
    let lookupData = null;
    if (process.env.GEMINI_API_KEY) {
      const prompt = `B\u1EA1n l\xE0 Tr\u1EE3 l\xFD t\u1EEB v\u1EF1ng v\xE0 gia s\u01B0 d\u1ECBch thu\u1EADt ti\u1EBFng Anh chuy\xEAn nghi\u1EC7p trong \u1EE9ng d\u1EE5ng "D\u1ECBch M\u1ED7i Ng\xE0y".
Ng\u01B0\u1EDDi h\u1ECDc \u0111ang l\xE0m b\xE0i t\u1EADp d\u1ECBch c\xE2u sau: "${cleanContext}" (Ch\u1EE7 \u0111\u1EC1: ${cleanCategory}).
Ng\u01B0\u1EDDi h\u1ECDc \u0111ang b\u1ECB b\u1ED1i r\u1ED1i ho\u1EB7c ch\u01B0a bi\u1EBFt t\u1EEB/c\u1EE5m t\u1EEB n\xE0y: "${cleanWord}".

H\xE3y ph\xE2n t\xEDch v\xE0 g\u1EE3i \xFD c\xE1ch d\u1ECBch ch\xEDnh x\xE1c, t\u1EF1 nhi\xEAn nh\u1EA5t cho t\u1EEB/c\u1EE5m t\u1EEB n\xE0y trong ng\u1EEF c\u1EA3nh c\xE2u tr\xEAn.
\u0110\u1EA3m b\u1EA3o tr\u1EA3 v\u1EC1 \u0110\xDANG 1 JSON Object tu\xE2n th\u1EE7 nghi\xEAm ng\u1EB7t c\u1EA5u tr\xFAc sau:
{
  "query": "${cleanWord}",
  "bestMatch": "T\u1EEB ho\u1EB7c c\u1EE5m t\u1EEB ti\u1EBFng Anh t\u01B0\u01A1ng \u0111\u01B0\u01A1ng chu\u1EA9n x\xE1c nh\u1EA5t (v\xED d\u1EE5: 'reschedule the meeting', 'keep someone posted')",
  "phonetic": "Phi\xEAn \xE2m IPA chu\u1EA9n qu\u1ED1c t\u1EBF n\u1EBFu c\xF3 (v\xED d\u1EE5: '/\u02CCri\u02D0\u02C8sked\u0292.u\u02D0l/')",
  "partOfSpeech": "T\u1EEB lo\u1EA1i ng\u1EAFn g\u1ECDn (noun, verb, phrasal verb, adjective, idiom...)",
  "meaningVi": "Ngh\u0129a ti\u1EBFng Vi\u1EC7t ng\u1EAFn g\u1ECDn, \u0111\xFAng ng\u1EEF c\u1EA3nh c\xE2u \u0111ang d\u1ECBch",
  "explanation": "Gi\u1EA3i th\xEDch 1-2 c\xE2u ng\u1EAFn g\u1ECDn, d\u1EC5 hi\u1EC3u v\u1EC1 c\xE1ch d\xF9ng t\u1EEB n\xE0y trong c\xE2u ng\u01B0\u1EDDi h\u1ECDc \u0111ang g\u1EB7p",
  "synonyms": ["T\u1EEB \u0111\u1ED3ng ngh\u0129a 1", "T\u1EEB \u0111\u1ED3ng ngh\u0129a 2"],
  "collocations": ["C\u1EE5m t\u1EEB hay \u0111i k\xE8m 1", "C\u1EE5m t\u1EEB hay \u0111i k\xE8m 2"],
  "exampleSentence": {
    "en": "M\u1ED9t c\xE2u v\xED d\u1EE5 ng\u1EAFn g\u1ECDn, th\u1EF1c t\u1EBF ch\u1EE9a t\u1EEB \u0111\xF3",
    "vi": "B\u1EA3n d\u1ECBch ti\u1EBFng Vi\u1EC7t c\u1EE7a c\xE2u v\xED d\u1EE5"
  },
  "usageTip": "M\u1EB9o nh\u1ECF ghi nh\u1EDB ho\u1EB7c l\u01B0u \xFD ng\u1EEF ph\xE1p/gi\u1EDBi t\u1EEB khi d\u1ECBch"
}`;
      const CANDIDATE_MODELS = [
        "gemini-3.8-flash",
        "gemini-3.1-flash-lite",
        "gemini-flash-latest"
      ];
      for (const modelCandidate of CANDIDATE_MODELS) {
        try {
          const response = await ai.models.generateContent({
            model: modelCandidate,
            contents: prompt,
            config: {
              temperature: 0.3,
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  query: { type: Type.STRING },
                  bestMatch: { type: Type.STRING },
                  phonetic: { type: Type.STRING },
                  partOfSpeech: { type: Type.STRING },
                  meaningVi: { type: Type.STRING },
                  explanation: { type: Type.STRING },
                  synonyms: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  },
                  collocations: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  },
                  exampleSentence: {
                    type: Type.OBJECT,
                    properties: {
                      en: { type: Type.STRING },
                      vi: { type: Type.STRING }
                    }
                  },
                  usageTip: { type: Type.STRING }
                },
                required: ["query", "bestMatch", "meaningVi", "explanation"]
              }
            }
          });
          if (response.text) {
            lookupData = JSON.parse(response.text);
            break;
          }
        } catch (geminiErr) {
          console.warn(`Gemini (${modelCandidate}) tra t\u1EEB l\u1ED7i:`, geminiErr?.message);
        }
      }
    }
    if (!lookupData) {
      lookupData = {
        query: cleanWord,
        bestMatch: cleanWord,
        phonetic: "",
        partOfSpeech: "Tra c\u1EE9u t\u1EEB",
        meaningVi: `Tra t\u1EEB: ${cleanWord}`,
        explanation: "B\u1EA1n c\xF3 th\u1EC3 xem tr\u1EF1c ti\u1EBFp k\u1EBFt qu\u1EA3 d\u1ECBch nhanh tr\xEAn Google D\u1ECBch.",
        synonyms: [],
        collocations: [],
        exampleSentence: {
          en: `Practice translating with "${cleanWord}"`,
          vi: `Luy\u1EC7n t\u1EADp d\u1ECBch v\u1EDBi t\u1EEB "${cleanWord}"`
        },
        usageTip: "H\xE3y xem g\u1EE3i \xFD t\u1EEB v\u1EF1ng trong b\xE0i t\u1EADp ho\u1EB7c tra tr\xEAn Google D\u1ECBch."
      };
    }
    return res.json({
      success: true,
      data: {
        ...lookupData,
        googleTranslateUrl
      }
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message || "L\u1ED7i x\u1EED l\xFD tra t\u1EEB v\u1EF1ng."
    });
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
    const otpNumber = 1e5 + crypto2.randomInt(0, 9e5);
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
var duelRooms = /* @__PURE__ */ new Map();
var quickMatchWaitingQueue = null;
function normalizeSentenceServer(text) {
  return (text || "").toLowerCase().trim().replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"').replace(/[.,!?;:()]/g, "").replace(/\s+/g, " ");
}
function generateDuelRoomId() {
  let id = "";
  do {
    const num = Math.floor(1e3 + Math.random() * 9e3);
    id = `DUEL-${num}`;
  } while (duelRooms.has(id));
  return id;
}
function pickDuelQuestions(count, category = "all", level = "all", mode = "sentence") {
  let pool = [...memoryQuestionsStore];
  if (category && category !== "all" && category !== "general") {
    const filtered = pool.filter((q) => q.category === category);
    if (filtered.length >= count) {
      pool = filtered;
    }
  }
  if (level && level !== "all") {
    const levelPool = pool.filter((q) => (q.level || "B1") === level);
    if (levelPool.length >= count) pool = levelPool;
  }
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, Math.min(count, pool.length)).map((q) => {
    if (mode !== "word") return q;
    const source = String(q.vi || "").replace(/[.,!?;:()]/g, "").split(/\s+/).find(Boolean) || q.vi;
    const target = String(q.answers?.[0] || "").replace(/[.,!?;:()]/g, "").split(/\s+/).find(Boolean) || "";
    return { ...q, vi: source, hints: `T\u1EEB tr\u1ECDng t\xE2m: ${target}`, answers: [target], wordBank: [target] };
  });
}
function serializeRoomState(room) {
  const playersObj = {};
  for (const [pId, p] of room.players.entries()) {
    playersObj[pId] = {
      id: p.id,
      name: p.name,
      avatar_url: p.avatar_url,
      isHost: p.isHost,
      score: p.score,
      currentQuestionIndex: p.currentQuestionIndex,
      answeredCount: p.answeredCount,
      isReady: p.isReady,
      isFinished: p.isFinished,
      lastAnswerCorrect: p.lastAnswerCorrect,
      lastAnswerText: p.lastAnswerText,
      typingLength: p.typingLength || 0
    };
  }
  const rematchObj = {};
  for (const [pId, v] of room.rematchVotes.entries()) {
    rematchObj[pId] = v;
  }
  return {
    roomId: room.roomId,
    status: room.status,
    category: room.category,
    level: room.level || "all",
    mode: room.mode || "sentence",
    questionCount: room.questionCount,
    players: playersObj,
    questions: room.questions.map((q) => ({
      id: q.id,
      vi: q.vi,
      hints: q.hints,
      level: q.level || "B1",
      category: q.category || "general",
      answers: q.answers
    })),
    currentRound: room.currentRound,
    roundTimerSeconds: room.roundTimerSeconds,
    roundStartedAt: room.roundStartedAt,
    winnerId: room.winnerId,
    rematchVotes: rematchObj
  };
}
function broadcastToRoom(room, payload, excludeWs) {
  const data = JSON.stringify(payload);
  for (const player of room.players.values()) {
    if (player.ws !== excludeWs && player.ws.readyState === WebSocket.OPEN) {
      player.ws.send(data);
    }
  }
}
function broadcastRoomState(room) {
  broadcastToRoom(room, {
    type: "room_state",
    state: serializeRoomState(room)
  });
}
app.get(["/api/duel/room/:id", "/duel/room/:id"], (req, res) => {
  const roomId = req.params.id.toUpperCase().trim();
  const room = duelRooms.get(roomId);
  if (!room) {
    return res.status(404).json({ exists: false, message: "Ph\xF2ng thi \u0111\u1EA5u kh\xF4ng t\u1ED3n t\u1EA1i ho\u1EB7c \u0111\xE3 k\u1EBFt th\xFAc" });
  }
  return res.json({
    exists: true,
    roomId: room.roomId,
    playerCount: room.players.size,
    status: room.status,
    category: room.category,
    questionCount: room.questionCount
  });
});
app.get(["/api/duel/stats", "/duel/stats"], (req, res) => {
  let totalActivePlayers = 0;
  for (const room of duelRooms.values()) {
    totalActivePlayers += room.players.size;
  }
  return res.json({
    activeRooms: duelRooms.size,
    totalPlayers: totalActivePlayers,
    waitingInQueue: quickMatchWaitingQueue ? 1 : 0
  });
});
var wss = new WebSocketServer({ server: httpServer, path: "/ws/duel" });
wss.on("connection", (ws) => {
  let currentRoomId = null;
  let currentPlayerId = null;
  ws.on("message", (messageRaw) => {
    try {
      const data = JSON.parse(messageRaw.toString());
      const { type } = data;
      if (type === "join_room") {
        const { roomId: rawRoomId, player, questionCount = 5, category = "all", level = "all", mode = "sentence" } = data;
        const pId = player?.id || `player-${Date.now()}`;
        const pName = player?.name || "Chi\u1EBFn binh";
        const pAvatar = player?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${pId}`;
        let targetRoomId = (rawRoomId || "").toUpperCase().trim();
        let room;
        if (targetRoomId) {
          room = duelRooms.get(targetRoomId);
          if (!room) {
            room = {
              roomId: targetRoomId,
              status: "waiting",
              category: category || "all",
              level: level || "all",
              mode: mode === "word" ? "word" : "sentence",
              questionCount: questionCount || 5,
              players: /* @__PURE__ */ new Map(),
              questions: [],
              currentRound: 0,
              roundTimerSeconds: 60,
              firstCorrectAnswers: /* @__PURE__ */ new Map(),
              rematchVotes: /* @__PURE__ */ new Map()
            };
            duelRooms.set(targetRoomId, room);
          }
        } else {
          targetRoomId = generateDuelRoomId();
          room = {
            roomId: targetRoomId,
            status: "waiting",
            category: category || "all",
            level: level || "all",
            mode: mode === "word" ? "word" : "sentence",
            questionCount: questionCount || 5,
            players: /* @__PURE__ */ new Map(),
            questions: [],
            currentRound: 0,
            roundTimerSeconds: 60,
            firstCorrectAnswers: /* @__PURE__ */ new Map(),
            rematchVotes: /* @__PURE__ */ new Map()
          };
          duelRooms.set(targetRoomId, room);
        }
        if (room.players.size >= 2 && !room.players.has(pId)) {
          ws.send(
            JSON.stringify({
              type: "error",
              message: "Ph\xF2ng n\xE0y \u0111\xE3 \u0111\u1EE7 2 ng\u01B0\u1EDDi thi \u0111\u1EA5u! Vui l\xF2ng nh\u1EADp m\xE3 ph\xF2ng kh\xE1c ho\u1EB7c t\u1EA1o ph\xF2ng m\u1EDBi."
            })
          );
          return;
        }
        currentRoomId = targetRoomId;
        currentPlayerId = pId;
        const isHost = room.players.size === 0 || room.players.has(pId) && room.players.get(pId).isHost;
        room.players.set(pId, {
          ws,
          id: pId,
          name: pName,
          avatar_url: pAvatar,
          isHost,
          score: 0,
          currentQuestionIndex: 0,
          answeredCount: 0,
          isReady: isHost,
          isFinished: false,
          typingLength: 0
        });
        ws.send(
          JSON.stringify({
            type: "joined_success",
            roomId: room.roomId,
            playerId: pId,
            isHost
          })
        );
        broadcastRoomState(room);
        broadcastToRoom(
          room,
          {
            type: "player_joined_event",
            player: { id: pId, name: pName, isHost }
          },
          ws
        );
      } else if (type === "find_match") {
        const { player, category = "all", questionCount = 5, level = "all", mode = "sentence" } = data;
        const pId = player?.id || `player-${Date.now()}`;
        const pName = player?.name || "Chi\u1EBFn binh";
        const pAvatar = player?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${pId}`;
        if (quickMatchWaitingQueue && quickMatchWaitingQueue.ws.readyState === WebSocket.OPEN && quickMatchWaitingQueue.player.id !== pId && quickMatchWaitingQueue.category === category && quickMatchWaitingQueue.level === level && quickMatchWaitingQueue.mode === (mode === "word" ? "word" : "sentence")) {
          const waitingItem = quickMatchWaitingQueue;
          quickMatchWaitingQueue = null;
          const newRoomId = generateDuelRoomId();
          const matchQuestions = pickDuelQuestions(questionCount, category, level, mode === "word" ? "word" : "sentence");
          const room = {
            roomId: newRoomId,
            status: "in_progress",
            category,
            level,
            mode: mode === "word" ? "word" : "sentence",
            questionCount,
            players: /* @__PURE__ */ new Map(),
            questions: matchQuestions,
            currentRound: 0,
            roundTimerSeconds: 60,
            roundStartedAt: Date.now(),
            firstCorrectAnswers: /* @__PURE__ */ new Map(),
            rematchVotes: /* @__PURE__ */ new Map()
          };
          room.players.set(waitingItem.player.id, {
            ws: waitingItem.ws,
            id: waitingItem.player.id,
            name: waitingItem.player.name,
            avatar_url: waitingItem.player.avatar_url,
            isHost: true,
            score: 0,
            currentQuestionIndex: 0,
            answeredCount: 0,
            isReady: true,
            isFinished: false,
            typingLength: 0
          });
          currentRoomId = newRoomId;
          currentPlayerId = pId;
          room.players.set(pId, {
            ws,
            id: pId,
            name: pName,
            avatar_url: pAvatar,
            isHost: false,
            score: 0,
            currentQuestionIndex: 0,
            answeredCount: 0,
            isReady: true,
            isFinished: false,
            typingLength: 0
          });
          duelRooms.set(newRoomId, room);
          waitingItem.ws.send(JSON.stringify({ type: "joined_success", roomId: newRoomId, playerId: waitingItem.player.id, isHost: true }));
          ws.send(JSON.stringify({ type: "joined_success", roomId: newRoomId, playerId: pId, isHost: false }));
          broadcastRoomState(room);
          broadcastToRoom(room, {
            type: "match_found",
            roomId: newRoomId
          });
        } else {
          quickMatchWaitingQueue = {
            ws,
            player: { id: pId, name: pName, avatar_url: pAvatar },
            category,
            questionCount,
            level,
            mode: mode === "word" ? "word" : "sentence"
          };
          currentPlayerId = pId;
          ws.send(JSON.stringify({ type: "waiting_in_queue", message: "\u0110ang t\xECm ki\u1EBFm \u0111\u1ED1i th\u1EE7 tr\u1EF1c tuy\u1EBFn..." }));
        }
      } else if (type === "cancel_find_match") {
        if (quickMatchWaitingQueue && quickMatchWaitingQueue.player.id === currentPlayerId) {
          quickMatchWaitingQueue = null;
        }
        ws.send(JSON.stringify({ type: "search_cancelled" }));
      } else if (type === "toggle_ready") {
        if (!currentRoomId || !currentPlayerId) return;
        const room = duelRooms.get(currentRoomId);
        if (!room) return;
        const player = room.players.get(currentPlayerId);
        if (player) {
          player.isReady = !player.isReady;
          broadcastRoomState(room);
        }
      } else if (type === "update_room_settings") {
        if (!currentRoomId || !currentPlayerId) return;
        const room = duelRooms.get(currentRoomId);
        if (!room || room.status !== "waiting") return;
        const host = room.players.get(currentPlayerId);
        if (!host || !host.isHost) return;
        if (data.questionCount) room.questionCount = data.questionCount;
        if (data.category) room.category = data.category;
        if (typeof data.level === "string") room.level = data.level;
        if (data.mode === "word" || data.mode === "sentence") room.mode = data.mode;
        broadcastRoomState(room);
      } else if (type === "start_game") {
        if (!currentRoomId || !currentPlayerId) return;
        const room = duelRooms.get(currentRoomId);
        if (!room) return;
        const host = room.players.get(currentPlayerId);
        if (!host || !host.isHost) {
          ws.send(JSON.stringify({ type: "error", message: "Ch\u1EC9 ch\u1EE7 ph\xF2ng m\u1EDBi c\xF3 th\u1EC3 b\u1EAFt \u0111\u1EA7u tr\u1EADn \u0111\u1EA5u!" }));
          return;
        }
        room.questions = pickDuelQuestions(room.questionCount, room.category, room.level, room.mode);
        room.status = "countdown";
        room.currentRound = 0;
        room.firstCorrectAnswers.clear();
        room.winnerId = null;
        for (const p of room.players.values()) {
          p.score = 0;
          p.currentQuestionIndex = 0;
          p.answeredCount = 0;
          p.isFinished = false;
          p.lastAnswerCorrect = void 0;
          p.lastAnswerText = void 0;
          p.typingLength = 0;
        }
        broadcastRoomState(room);
        let count = 3;
        const countdownTimer = setInterval(() => {
          count--;
          if (count > 0) {
            broadcastToRoom(room, { type: "countdown_tick", count });
          } else {
            clearInterval(countdownTimer);
            room.status = "in_progress";
            room.roundStartedAt = Date.now();
            broadcastRoomState(room);
            broadcastToRoom(room, { type: "game_started" });
          }
        }, 1e3);
      } else if (type === "submit_answer") {
        if (!currentRoomId || !currentPlayerId) return;
        const room = duelRooms.get(currentRoomId);
        if (!room || room.status !== "in_progress") return;
        const player = room.players.get(currentPlayerId);
        if (!player || player.isFinished) return;
        const { questionIndex, answer } = data;
        const currentQ = room.questions[questionIndex];
        if (!currentQ) return;
        const normUser = normalizeSentenceServer(answer);
        const normAnswers = (currentQ.answers || []).map(normalizeSentenceServer);
        const isCorrect = normAnswers.some((ans) => ans === normUser);
        if (isCorrect) {
          const isFirst = !room.firstCorrectAnswers.has(questionIndex);
          if (isFirst) {
            room.firstCorrectAnswers.set(questionIndex, player.id);
          }
          const basePoints = 100;
          const speedBonus = isFirst ? 50 : 0;
          const pointsEarned = basePoints + speedBonus;
          player.score += pointsEarned;
          player.currentQuestionIndex++;
          player.answeredCount++;
          player.lastAnswerCorrect = true;
          player.lastAnswerText = answer;
          ws.send(
            JSON.stringify({
              type: "answer_result",
              correct: true,
              pointsEarned,
              isFirst,
              questionIndex,
              playerScore: player.score,
              currentQuestionIndex: player.currentQuestionIndex
            })
          );
          broadcastToRoom(
            room,
            {
              type: "opponent_scored",
              playerId: player.id,
              playerName: player.name,
              questionIndex,
              isFirst,
              score: player.score
            },
            ws
          );
          if (player.answeredCount >= room.questions.length) {
            player.isFinished = true;
            let allFinished = true;
            for (const p of room.players.values()) {
              if (!p.isFinished) {
                allFinished = false;
                break;
              }
            }
            if (allFinished) {
              room.status = "finished";
              let maxScore = -1;
              let winnerId = null;
              for (const p of room.players.values()) {
                if (p.score > maxScore) {
                  maxScore = p.score;
                  winnerId = p.id;
                } else if (p.score === maxScore) {
                  winnerId = null;
                }
              }
              room.winnerId = winnerId;
            }
          }
          broadcastRoomState(room);
        } else {
          player.lastAnswerCorrect = false;
          player.lastAnswerText = answer;
          ws.send(
            JSON.stringify({
              type: "answer_result",
              correct: false,
              questionIndex,
              message: "B\u1EA3n d\u1ECBch ch\u01B0a ch\xEDnh x\xE1c, h\xE3y th\u1EED l\u1EA1i!"
            })
          );
        }
      } else if (type === "typing") {
        if (!currentRoomId || !currentPlayerId) return;
        const room = duelRooms.get(currentRoomId);
        if (!room || room.status !== "in_progress") return;
        const player = room.players.get(currentPlayerId);
        if (player) {
          player.typingLength = data.textLength || 0;
          broadcastToRoom(
            room,
            {
              type: "opponent_typing",
              playerId: player.id,
              typingLength: player.typingLength
            },
            ws
          );
        }
      } else if (type === "send_emote") {
        if (!currentRoomId || !currentPlayerId) return;
        const room = duelRooms.get(currentRoomId);
        if (!room) return;
        const player = room.players.get(currentPlayerId);
        if (player) {
          broadcastToRoom(room, {
            type: "emote_received",
            senderId: player.id,
            senderName: player.name,
            emote: data.emote || "\u{1F525}"
          });
        }
      } else if (type === "skip_question") {
        if (!currentRoomId || !currentPlayerId) return;
        const room = duelRooms.get(currentRoomId);
        if (!room || room.status !== "in_progress") return;
        const player = room.players.get(currentPlayerId);
        if (!player || player.isFinished) return;
        player.currentQuestionIndex++;
        player.answeredCount++;
        player.lastAnswerCorrect = false;
        if (player.answeredCount >= room.questions.length) {
          player.isFinished = true;
          let allFinished = true;
          for (const p of room.players.values()) {
            if (!p.isFinished) {
              allFinished = false;
              break;
            }
          }
          if (allFinished) {
            room.status = "finished";
            let maxScore = -1;
            let winnerId = null;
            for (const p of room.players.values()) {
              if (p.score > maxScore) {
                maxScore = p.score;
                winnerId = p.id;
              } else if (p.score === maxScore) {
                winnerId = null;
              }
            }
            room.winnerId = winnerId;
          }
        }
        ws.send(JSON.stringify({ type: "question_skipped", currentQuestionIndex: player.currentQuestionIndex }));
        broadcastRoomState(room);
      } else if (type === "request_rematch") {
        if (!currentRoomId || !currentPlayerId) return;
        const room = duelRooms.get(currentRoomId);
        if (!room) return;
        room.rematchVotes.set(currentPlayerId, true);
        let allAgreed = room.players.size > 0;
        for (const p of room.players.values()) {
          if (!room.rematchVotes.get(p.id)) {
            allAgreed = false;
            break;
          }
        }
        if (allAgreed) {
          room.questions = pickDuelQuestions(room.questionCount, room.category, room.level, room.mode);
          room.status = "countdown";
          room.firstCorrectAnswers.clear();
          room.rematchVotes.clear();
          room.winnerId = null;
          for (const p of room.players.values()) {
            p.score = 0;
            p.currentQuestionIndex = 0;
            p.answeredCount = 0;
            p.isFinished = false;
            p.lastAnswerCorrect = void 0;
            p.lastAnswerText = void 0;
            p.typingLength = 0;
          }
          broadcastRoomState(room);
          let count = 3;
          const cd = setInterval(() => {
            count--;
            if (count > 0) {
              broadcastToRoom(room, { type: "countdown_tick", count });
            } else {
              clearInterval(cd);
              room.status = "in_progress";
              room.roundStartedAt = Date.now();
              broadcastRoomState(room);
              broadcastToRoom(room, { type: "game_started" });
            }
          }, 1e3);
        } else {
          broadcastRoomState(room);
          broadcastToRoom(room, {
            type: "rematch_requested_by_player",
            playerId: currentPlayerId
          });
        }
      } else if (type === "leave_room") {
        if (currentRoomId && currentPlayerId) {
          const room = duelRooms.get(currentRoomId);
          if (room) {
            room.players.delete(currentPlayerId);
            if (room.players.size === 0) {
              duelRooms.delete(currentRoomId);
            } else {
              const remainingPlayer = Array.from(room.players.values())[0];
              if (remainingPlayer) {
                remainingPlayer.isHost = true;
              }
              broadcastRoomState(room);
              broadcastToRoom(room, {
                type: "player_left_event",
                playerId: currentPlayerId
              });
            }
          }
          currentRoomId = null;
          currentPlayerId = null;
        }
      }
    } catch (err) {
      console.error("[WebSocket Duel Error]", err);
    }
  });
  ws.on("close", () => {
    if (quickMatchWaitingQueue && quickMatchWaitingQueue.ws === ws) {
      quickMatchWaitingQueue = null;
    }
    if (currentRoomId && currentPlayerId) {
      const room = duelRooms.get(currentRoomId);
      if (room) {
        room.players.delete(currentPlayerId);
        if (room.players.size === 0) {
          duelRooms.delete(currentRoomId);
        } else {
          const remainingPlayer = Array.from(room.players.values())[0];
          if (remainingPlayer) {
            remainingPlayer.isHost = true;
          }
          broadcastRoomState(room);
          broadcastToRoom(room, {
            type: "player_disconnected_event",
            playerId: currentPlayerId
          });
        }
      }
    }
  });
});
async function start2() {
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
  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server & WebSocket \u0111ang ch\u1EA1y tr\xEAn http://localhost:${PORT}`);
  });
}
if (!process.env.VERCEL) {
  start2();
}
var server_default = app;
export {
  server_default as default
};
