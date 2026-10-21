# Noor Habit — Android Studio ও APK বিল্ড গাইড

এই ZIP-এ আপডেট করা Noor Habit Android Studio source project রয়েছে। ওয়েব UI production build সফল হয়েছে; তবে Android/Gradle build বা Xiaomi HyperOS ফোনে পরীক্ষা করা যায়নি, তাই এটিকে পরীক্ষিত APK বলা যাবে না। Android Studio-তে খুলে APK build করে YouTube Shorts, Facebook Reels, accessibility পুনরুদ্ধার, restart ও RAM-cleaner আচরণ বাস্তব ফোনে যাচাই করুন।

---

## ১. AI কনফিগারেশন ও API key নিরাপত্তা

AI API key কখনো Android/browser bundle-এ রাখবেন না। Web server চালাতে `.env.example` কপি করে `.env` বানান এবং server-side `AI_API_KEY`-এ আপনার provider key দিন; `.env` Git-এ commit করবেন না। Android app-এর AI feature ব্যবহারের জন্য `VITE_API_BASE`-এ আপনার deployed Noor Habit server URL দিন, তারপর web app build করে `npx cap sync android` চালান। Android app AI সেবায় `/api/public/chat` server endpoint দিয়ে কথা বলে।

> **গুরুত্বপূর্ণ:** আগের build-এ hardcoded থাকা AI key-টি প্রকাশিত বলে ধরে provider dashboard থেকে revoke/rotate করুন; শুধু Git-এ মুছে দিলেই পুরোনো key নিরাপদ হয় না।

## ২. এই আপডেটে যা আছে
- YouTube Shorts ও Facebook Reels শনাক্তকরণের accessibility fallback এবং content-change event handling।
- Profile picture preview এবং zoom control; zoom preference profile-এ সংরক্ষিত।
- অ্যাপের নির্বাচিত theme color-এর সাথে native reels counter icon এবং border-এর রঙ মেলানো।
- ডিসপ্লে আকারে সামান্য বৃদ্ধি এবং Settings-এর শেষে “Made by Tasrif Islam” credit।

এইগুলো কোডে যোগ হয়েছে; Android build/phone test না হওয়া পর্যন্ত HyperOS বা অন্য ডিভাইসে কাজ নিশ্চিত নয়। Accessibility Service Android/HyperOS-এর battery/background restrictions-এর অধীনে; OS RAM cleaner জোর করে বন্ধ করলে সম্পূর্ণ auto-restart নিশ্চয়তা দেওয়া যায় না।

## ৩. Android Studio দিয়ে APK বিল্ড করার ধাপ

১. আপনার পিসিতে **Android Studio** ওপেন করুন।
২. **Open**-এ ক্লিক করে এই জিপ ফাইলের ভেতরের `android` ফোল্ডারটি সিলেক্ট করুন।
৩. Gradle সিঙ্ক সম্পন্ন হওয়া পর্যন্ত ৩০-৬০ সেকেন্ড অপেক্ষা করুন।
৪. উপরের মেনু থেকে:
   **Build** ➔ **Build Bundle(s) / APK(s)** ➔ **Build APK(s)**-এ ক্লিক করুন।
৫. কয়েক সেকেন্ডের মধ্যে ডানদিকের নিচে **"Build APK(s) successfully"** নোটিফিকেশন আসবে। সেখানে **locate**-এ ক্লিক করলেই আপনার রেডি `app-debug.apk` পেয়ে যাবেন, যা আপনি যেকোনো ফোনে ইনস্টল করে ব্যবহার বা অন্যদের শেয়ার করতে পারবেন।

---

## ৩. এই সংস্করণে করা আপডেট:

1. **AI সেকশন ঠিক করা:** `.env` থেকে সেন্ট্রাল কনফিগারেশনের মাধ্যমে সরাসরি চ্যাট এপিআই হ্যান্ডলিং করা হয়েছে। ব্যালেন্স শেষ বা ভুল কি হলে সুন্দর করে ত্রুটি বার্তা দেখাবে।
2. **রিফ্রেশিং UI ঠিক করা:** রিফ্রেশ ব্যানারটি স্ক্রিনের মাঝখানে আটকে থাকা বা অপ্রয়োজনীয়ভাবে ভেসে ওঠার সমস্যা সমাধান করা হয়েছে।
3. **নিচের ফাংশন বার ও লেখার ওভারল্যাপ ঠিক করা:** নিচের নেভিগেশন বারকে সম্পূর্ণ ওয়েক ব্যাকড্রপ ও অতিরিক্ত সেফ-এরিয়া প্যাডিং দিয়ে ফিক্স করা হয়েছে; স্ক্রল করলেও কোনো লেখা বারের নিচ দিয়ে অস্পষ্টভাবে দেখা যাবে না।
4. **নোটিফিকেশন পপওভার UI ঠিক করা:** নোটিফিকেশন প্যানেল সম্পূর্ণ অপেক ও স্ক্রিনের সাইজ অনুযায়ী রেসপন্সিভ করা হয়েছে এবং বাইরে টাচ করলেই বন্ধ হবে।
5. **স্ক্রিন নড়াচড়া (Desktop mode feel) ফিক্স:** ফ্রেন্ডস ও সেটিংস স্ক্রিনের অতিরিক্ত প্রস্থ এবং অনুভূমিক স্ক্রলিং (`overflow-x: hidden`) বন্ধ করে খাঁটি মোবাইল অ্যাপের মতো লক করা হয়েছে।
6. **টোন সাউন্ড প্লে হওয়া:** সাউন্ড ইঞ্জিন আপগ্রেড করা হয়েছে এবং টেস্ট বাটনে চাপলেই প্রাকদর্শন টোন বাজবে।
7. **ভাষার নাম:** শুধুমাত্র **"বাংলা"** এবং **"English"** রাখা হয়েছে।
8. **বিল্ট-ইন স্যাম্পল ও উদাহরণ দূর করা:** সব ডিফল্ট স্যাম্পল গোল ও টু-ডু মুছে ফেলা হয়েছে এবং `(e.g......)` ও `(যেমন: ...)` প্লেসহোল্ডারগুলো পরিষ্কার ও মার্জিত করা হয়েছে।
9. **অ্যাপ ওপেনিং ইন্ট্রো:** স্প্ল্যাশ স্ক্রিনের সময় বাড়িয়ে ২.৬ সেকেন্ড করা হয়েছে যেন সুন্দর নূর লোগো ও বার্তাটি সহজে দেখা যায়।
10. **ব্যাকগ্রাউন্ড ও লক স্ক্রিন নোটিফিকেশন:** অ্যান্ড্রয়েড হাই-ইমপর্টেন্স নোটিফিকেশন চ্যানেল ও `allowWhileIdle: true` সহ এক্সাক্ট অ্যালার্ম শিডিউল যুক্ত করা হয়েছে।


## গুরুত্বপূর্ণ যাচাই

- Reels/Shorts শনাক্তকরণ সামাজিক অ্যাপের Accessibility UI-র ওপর নির্ভরশীল; অ্যাপ আপডেট হলে UI বদলাতে পারে। YouTube Shorts-সহ সব প্ল্যাটফর্মে নির্ভুলতা নিশ্চিত করতে বাস্তব ডিভাইসে পরীক্ষা প্রয়োজন।
- Android-এ background service বন্ধ হওয়া ফোনের নির্মাতা, Battery optimization, এবং OS সংস্করণের ওপর নির্ভর করতে পারে। ZIP-এ এমন কোনো নিশ্চয়তা নেই যে প্রতিটি ফোনে RAM clear করার পরও tracking চলবে। Noor Habit-এর battery/background অনুমতি একবার চালু রাখুন এবং ফোনে যাচাই করুন।
- Android APK তৈরির জন্য Android Studio ও Android SDK/Gradle প্রয়োজন।
