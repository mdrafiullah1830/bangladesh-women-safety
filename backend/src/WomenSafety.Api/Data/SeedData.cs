using Microsoft.EntityFrameworkCore;
using WomenSafety.Application.Security;
using WomenSafety.Domain.Entities;
using WomenSafety.Domain.Enums;

namespace WomenSafety.Api.Data;

/// <summary>
/// Idempotent bootstrap: creates the schema (no EF migrations in this project) and, when the
/// database is empty, seeds Bangladesh geography, the helpline/directory data, safety content,
/// demo accounts and anonymised demo incidents used by the public statistics screens.
/// </summary>
public static class SeedData
{
    private static readonly (string Code, string NameBn, string NameEn)[] Divisions =
    {
        ("DH", "ঢাকা", "Dhaka"),
        ("CT", "চট্টগ্রাম", "Chattogram"),
        ("RA", "রাজশাহী", "Rajshahi"),
        ("KH", "খুলনা", "Khulna"),
        ("BA", "বরিশাল", "Barishal"),
        ("SY", "সিলেট", "Sylhet"),
        ("RP", "রংপুর", "Rangpur"),
        ("MY", "ময়মনসিংহ", "Mymensingh")
    };

    private static readonly (string Div, string Code, string NameBn, string NameEn, double Lat, double Lng)[] Districts =
    {
        ("DH","DHK-01","ঢাকা","Dhaka",23.8103,90.4125),
        ("DH","DHK-02","গাজীপুর","Gazipur",23.9915,90.4145),
        ("DH","DHK-03","কিশোরগঞ্জ","Kishoreganj",24.4449,90.7767),
        ("DH","DHK-04","মানিকগঞ্জ","Manikganj",23.8617,90.0260),
        ("DH","DHK-05","মুন্সিগঞ্জ","Munshiganj",23.5422,90.5305),
        ("DH","DHK-06","নারায়ণগঞ্জ","Narayanganj",23.6230,90.5000),
        ("DH","DHK-07","নরসিংদী","Narsingdi",23.9320,90.7150),
        ("DH","DHK-08","টাঙ্গাইল","Tangail",24.2513,89.9167),
        ("DH","DHK-09","ফরিদপুর","Faridpur",23.6010,89.8420),
        ("DH","DHK-10","গোপালগঞ্জ","Gopalganj",23.0050,89.8260),
        ("DH","DHK-11","মাদারীপুর","Madaripur",23.1640,90.1990),
        ("DH","DHK-12","রাজবাড়ী","Rajbari",23.7570,89.6440),
        ("DH","DHK-13","শরীয়তপুর","Shariatpur",23.2060,90.3530),
        ("CT","CTG-01","চট্টগ্রাম","Chattogram",22.3569,91.7832),
        ("CT","CTG-02","কক্সবাজার","Cox's Bazar",21.4272,91.9833),
        ("CT","CTG-03","বান্দরবান","Bandarban",22.1950,92.2200),
        ("CT","CTG-04","রাঙ্গামাটি","Rangamati",22.6560,92.1760),
        ("CT","CTG-05","খাগড়াছড়ি","Khagrachhari",23.1190,91.9840),
        ("CT","CTG-06","ফেনী","Feni",23.0140,91.3970),
        ("CT","CTG-07","লক্ষ্মীপুর","Lakshmipur",22.9420,90.8410),
        ("CT","CTG-08","কুমিল্লা","Cumilla",23.4570,91.1880),
        ("CT","CTG-09","নোয়াখালী","Noakhali",22.8690,91.0990),
        ("CT","CTG-10","ব্রাহ্মণবাড়িয়া","Brahmanbaria",23.9570,91.1110),
        ("CT","CTG-11","চাঁদপুর","Chandpur",23.2330,90.6710),
        ("RA","RAJ-01","রাজশাহী","Rajshahi",24.3745,88.6042),
        ("RA","RAJ-02","বগুড়া","Bogura",24.8480,89.3730),
        ("RA","RAJ-03","নওগাঁ","Naogaon",24.8040,88.9430),
        ("RA","RAJ-04","নাটোর","Natore",24.4130,88.9870),
        ("RA","RAJ-05","চাঁপাইনবাবগঞ্জ","Chapainawabganj",24.5970,88.2770),
        ("RA","RAJ-06","পাবনা","Pabna",24.0000,89.2330),
        ("RA","RAJ-07","সিরাজগঞ্জ","Sirajganj",24.4540,89.7000),
        ("RA","RAJ-08","জয়পুরহাট","Joypurhat",25.0940,89.0280),
        ("KH","KHL-01","খুলনা","Khulna",22.8098,89.5644),
        ("KH","KHL-02","বাগেরহাট","Bagerhat",22.6600,89.7900),
        ("KH","KHL-03","সাতক্ষীরা","Satkhira",22.7100,89.0700),
        ("KH","KHL-04","যশোর","Jashore",23.1660,89.2080),
        ("KH","KHL-05","ঝিনাইদহ","Jhenaidah",23.5450,89.1720),
        ("KH","KHL-06","মাগুরা","Magura",23.4870,89.4200),
        ("KH","KHL-07","নড়াইল","Narail",23.1650,89.5100),
        ("KH","KHL-08","কুষ্টিয়া","Kushtia",23.9010,89.1210),
        ("KH","KHL-09","চুয়াডাঙ্গা","Chuadanga",23.6400,88.8420),
        ("KH","KHL-10","মেহেরপুর","Meherpur",23.7700,88.6320),
        ("BA","BAR-01","বরিশাল","Barishal",22.7010,90.3530),
        ("BA","BAR-02","পটুয়াখালী","Patuakhali",22.3590,90.3290),
        ("BA","BAR-03","ভোলা","Bhola",22.6860,90.6470),
        ("BA","BAR-04","পিরোজপুর","Pirojpur",22.5800,89.9770),
        ("BA","BAR-05","বরগুনা","Barguna",22.1540,90.1260),
        ("BA","BAR-06","ঝালকাঠি","Jhalokati",22.6410,90.1990),
        ("SY","SYL-01","সিলেট","Sylhet",24.8949,91.8687),
        ("SY","SYL-02","মৌলভীবাজার","Moulvibazar",24.4840,91.7770),
        ("SY","SYL-03","হবিগঞ্জ","Habiganj",24.3740,91.4150),
        ("SY","SYL-04","সুনামগঞ্জ","Sunamganj",25.0640,91.4000),
        ("RP","RNG-01","রংপুর","Rangpur",25.7439,89.2752),
        ("RP","RNG-02","দিনাজপুর","Dinajpur",25.6270,88.6330),
        ("RP","RNG-03","ঠাকুরগাঁও","Thakurgaon",26.0340,88.4610),
        ("RP","RNG-04","পঞ্চগড়","Panchagarh",26.3340,88.5600),
        ("RP","RNG-05","নীলফামারী","Nilphamari",25.9310,88.8560),
        ("RP","RNG-06","লালমনিরহাট","Lalmonirhat",25.9180,89.4450),
        ("RP","RNG-07","কুড়িগ্রাম","Kurigram",25.8060,89.6360),
        ("RP","RNG-08","গাইবান্ধা","Gaibandha",25.3290,89.5420),
        ("MY","MYM-01","ময়মনসিংহ","Mymensingh",24.7470,90.4110),
        ("MY","MYM-02","জামালপুর","Jamalpur",24.9190,89.9380),
        ("MY","MYM-03","নেত্রকোণা","Netrokona",24.8810,90.7270),
        ("MY","MYM-04","শেরপুর","Sherpur",25.0260,90.0060)
    };

    private static readonly (string Service, string ServiceBn, string Number, DirectoryCategory Cat, string NoteEn, string NoteBn, int Sort)[] Numbers =
    {
        ("National Emergency Service","জাতীয় জরুরি সেবা","999",DirectoryCategory.GOVERNMENT,"Police, fire, ambulance and disaster response across Bangladesh","পুলিশ, ফায়ার সার্ভিস, অ্যাম্বুলেন্স ও দুর্যোগ সাড়া",1),
        ("Violence Against Women Helpline","নারী ও শিশু নির্যাতন প্রতিরোধ হেল্পলাইন","109",DirectoryCategory.COUNSELING,"24/7 counselling and complaint intake","২৪/৭ কাউন্সেলিং ও অভিযোগ গ্রহণ",2),
        ("Onuraksha (Women & Children)","ওনুরাক্ষা — নারী ও শিশু বিষয়ক মন্ত্রণালয়","106",DirectoryCategory.COUNSELING,"Emergency response unit for women and children","নারী ও শিশুর জরুরি সাড়া",3),
        ("National Health Helpline","স্বাস্থ্য বাতায়ন","16263",DirectoryCategory.AMBULANCE,"Health advice and ambulance guidance","স্বাস্থ্য পরামর্শ ওঅ্যাম্বুলেন্স তথ্য",4),
        ("National Legal Aid","জাতীয় আইন সেবা","16432",DirectoryCategory.LEGAL_AID,"Free legal aid from Legal Aid Services Board","আইন সেবা কন্ট্রোল বোর্ড থেকে বিনামূল্যেআইনি সহায়তা",5),
        ("Arogga Batayon","আরোগ্য বাতায়ন","333",DirectoryCategory.AMBULANCE,"BCS Health Care medical advice line","বিসিএস হেলথ কেয়ার চিকিৎসা পরামর্শ",6)
    };

    private static readonly (string TitleEn, string TitleBn, LegalResourceCategory Cat, string Law, string SumEn, string SumBn, string Phone, int Sort)[] Laws =
    {
        ("Women and Children Repression Prevention Act, 2000","নারী ও শিশু নির্যাতন দমন আইন, ২০০০",LegalResourceCategory.LAW,"Act No. 8 of 2000","Covers physical and mental torture, acid violence, dowry torture and sexual offences against women and children.","নারী ও শিশুর বিরুদ্ধ শারীরিক ও মানসিক নির্যাতন, অ্যাসিড হামলা, যৌতুকজনিত নির্যাতন ওযৌন অপরাধ দমন করে।","109",1),
        ("Women and Children Repression Prevention (Amendment) Ordinance, 2024","মহিলা ও শিশু নির্যাতন দমন (সংশোধন) অধ্যাদেশ, ২০২৪",LegalResourceCategory.LAW,"Amendment 2024","Introduced life imprisonment until death for rape and stricter sentencing for sexual offences.","ধর্ষণের জন্য সারাজীবন কারাদণ্ডসহ যৌন অপরাধে কঠোর শাস্তির ব্যবস্থা।","109",2),
        ("Penal Code sections 97-100 — grievous hurt / acid","দণ্ডবিধি ১৮৬০ ধারা ৯৭-১০০ — গুরুতর আঘাত ও অ্যাসিড",LegalResourceCategory.GUIDE,"Penal Code 1860","Prohibits throwing acid or other corrosive substances and prescribes punishment.","অ্যাসিড বা ক্ষয়কারী পদার্থ ছোড়া নিষিদ্ধ ও তার শাস্তির ব্যবস্থা।","",3),
        ("Digital Security Act, 2018 — section 29 harassment","ডিজিটাল নিরাপত্তা আইন, ২০১৮ — ধারা ২৯",LegalResourceCategory.LAW,"Act No. 46 of 2018","Criminalises online stalking, blackmail and non-consensual sharing of intimate images.","অনলাইনে গায়ে পড়া, ব্ল্যাকমেল ও সম্মতি ছাড়া আপত্তিকর ছবি ছড়ানোঅপরাধ।","109",4),
        ("Constitution articles 28 and 32","সংবিধানের ধারা ২৮ ও ৩২",LegalResourceCategory.GUIDE,"Constitution of Bangladesh","Equality before law and the right to life and personal liberty.","সমতা ও জীবন ও ব্যক্তিগত স্বাধীনতার মৌলিক অধিকার।","",5),
        ("National Legal Aid Services Board","জাতীয় আইন সেবা কন্ট্রোল বোর্ড",LegalResourceCategory.LEGAL_AID,"Legal Aid Services Act 2000","Free representation for women and children in criminal and family matters.","ফৌজদারি ও পারিবারিক মামলায় নারী ও শিশুর বিনামূল্যে আইনি প্রতিনিধিত্ব।","16432",6),
        ("One Stop Crisis Centre (OCC)","ওয়ান স্টপ ক্রাইসিস সেন্টার",LegalResourceCategory.HOTLINE,"BSMMU / district OCC","Medical, legal, police and shelter support under one roof at district level.","জেলা পর্যায়ে চিকিৎসা, আইনি, পুলিশ ও আশ্রয় সহায়তা এক ছাদের নিচে।","109",7),
        ("Domestic Violence (Prevention and Protection) Act, 2010","গৃহস্থালি সহিংসতা (প্রতিরোধ ও সুরক্ষা) আইন, ২০১০",LegalResourceCategory.LAW,"Act No. 5 of 2010","Protects household members from domestic violence and provides protection orders.","গৃহস্থালি সদস্যদের সহিংসতা থেকে সুরক্ষা ও সুরক্ষার আদেশের ব্যবস্থা।","109",8),
        ("Child Marriage Restraint Act, 2017","শিশু বিবাহ নিষেধ আইন, ২০১৭",LegalResourceCategory.LAW,"Act No. 52 of 2017","Sets 18 as the minimum marriage age with limited exceptions through court.","বিবাহের ন্যূনতম বয়স ১৮ নির্ধারণ ও আদালতের মাধ্যমে সীমিত ব্যতিক্রম।","",9),
        ("Trafficking in Persons Prevention and Suppression Act, 2012","মানব পাচার প্রতিরোধ ও দমন আইন, ২০১২",LegalResourceCategory.LAW,"Act No. 3 of 2012","Criminalises trafficking in persons including forced labour and sexual exploitation.","জোরপূর্বক শ্রম ওযৌন শোষণসহ মানব পাচার অপরাধীকরণ।","",10)
    };

    private static readonly (string Cat, string TitleEn, string TitleBn, string BodyEn, string BodyBn, bool Night, int Sort)[] Tips =
    {
        ("TRAVEL","Share your trip before leaving","যাত্রার আগে ট্রিপ শেয়ার করুন","Start a trip in the app so a trusted contact knows your destination and expected arrival time.","অ্যাপে ট্রিপ শুরু করুন যাতে বিশ্বস্ত ব্যক্তি আপনার গন্তব্য ও পৌঁছার সময় জানেন।",false,1),
        ("TRAVEL","Sit near the driver or conductor","চালক বা কন্ডাক্টরের কাছে বসুন","In rickshaws, CNG or buses, avoid the empty rear seats late at night.","রাতে রিকশা, সিএনজি বা বাসে খালি পিছনের আসন এড়িয়ে চলুন।",true,2),
        ("TRAVEL","Keep the ride receipt visible","যাত্রার রসিদ দৃশ্যমান রাখুন","Show trip details to someone when you board an unfamiliar vehicle.","অপরিচিত গাড়িতে ওঠার সময় যাত্রার বিবরণ কাউকে দেখান।",false,3),
        ("DIGITAL","Do not accept unknown friend requests","অজানা বন্ধুত্ব অনুরোধ গ্রহণ করবেন না","Most cyber-harassment starts with an unknown social media account.","বেশিরভাগ সাইবার হয়রানি অজানা সোশ্যাল মিডিয়া অ্যাকাউন্ট থেকে শুরু হয়।",false,4),
        ("DIGITAL","Screenshot and preserve evidence","স্ক্রিনশট নিয়ে প্রমাণ সংরক্ষণ করুন","Keep messages, profiles and call logs before blocking anyone.","কাউকে ব্লক করার আগে বার্তা, প্রোফাইল ও কল লগ সংরক্ষণ করুন।",false,5),
        ("DIGITAL","Lock your profile and location tags","প্রোফাইল ও লোকেশন ট্যাগ লক করুন","Turn off live location tagging so strangers cannot follow your routine.","লাইভ লোকেশন ট্যাগ বন্ধ করুন যাতে অচেনা কেউ আপনার রুট ট্র্যাক না করে।",false,6),
        ("HOME","Verify delivery and service workers","ডেলিভারি ও সার্ভিস কর্মী যাচাই করুন","Ask them to wait outside and confirm the order before opening the door.","দরজা খোলার আগে অর্ডার নিশ্চিত করে বাইরেই অপেক্ষা করতে বলুন।",false,7),
        ("HOME","Share a live location when alone at home","ঘরে একা থাকলে লাইভ লোকেশন শেয়ার করুন","Use the location share link while expecting a visitor or a delivery.","সাক্ষাতকারী বা ডেলিভারি আশা করলে লোকেশন শেয়ার লিংক ব্যবহার করুন।",false,8),
        ("NIGHT","Walk in well-lit, busy streets","আলোকিত ও ভিড়যুক্ত রাস্তায় হাঁটুন","Avoid shortcuts through fields or empty alleys at night.","রাতে মাঠ বা খালি গলির শর্টকাট এড়িয়ে চলুন।",true,9),
        ("NIGHT","Keep phone charged above 30%","ফোন চার্জ ৩০% এর উপরে রাখুন","An empty battery removes your ability to call for help.","ফোনের ব্যাটারি শেষ হলে সাহায্য চাওয়ার উপায়ও বন্ধ হয়ে যায়।",true,10),
        ("NIGHT","Share auto-rickshaw number","অটোরিকশার নম্বর শেয়ার করুন","Send a photo of the number plate to a trusted contact before boarding.","ওঠার আগে নম্বর প্লেটের ছবি বিশ্বস্ত ব্যক্তিকে পাঠান।",true,11),
        ("EMERGENCY","Use press-and-hold SOS","প্রেস-অ্যান্ড-হোল্ড ব্যবহার করুন","Holding the SOS button for 3 seconds prevents accidental activation and starts the alert cascade.","৩ সেকেন্ড ধরে রাখলে ভুলে চাপা পড়ে না এবং সতর্কতা ক্যাসকেড শুরু হয়।",false,12),
        ("EMERGENCY","Call 999 even if you cannot speak","কথা বলতে না পারলেও ৯৯৯ এ কল করুন","Dial 999 and keep the line open; location can still be discussed later.","৯৯৯ এ কল করে লাইন খোলা রাখুন; পরে লোকেশন জানানো যাবে।",false,13),
        ("EMERGENCY","Fake call can get you out","ফেক কল দিয়ে বের হয়ে আসা যায়","Use the fake call tool when you feel cornered and need an excuse to leave.","অসহজ পরিস্থিতিতে বের হওয়ার অজুহাতে ফেক কল টুল ব্যবহার করুন।",false,14),
        ("SELF_DEFENCE","Aim for soft targets","নরম অংশে আঘাত করুন","A sharp knee, elbow or stomp to the groin, eyes or feet creates the chance to run.","হাঁটু, কনুই বা পা দিয়ে গোড়ালি, চোখ বা পায়ে আঘাত করে পালানোর সুযোগ তৈরি করুন।",false,15),
        ("SELF_DEFENCE","Make noise first","আগে শোরগোল করুন","Shouting draws bystanders and disrupts the attacker's plan.","চিৎকার করলে পাশের লোকজন আসে ও আক্রমণকারীর পরিকল্পনা ভেঙে যায়।",false,16),
        ("SELF_DEFENCE","Carry a whistle","হুইসেল বহন করুন","A whistle carries further than a scream and needs no breath control.","হুইসেলের শব্দ চিৎকারের চেয়ে দূরে যায় এবং শ্বাস নিয়ন্ত্রণ লাগে না।",false,17),
        ("LEGAL","Report within 24 hours","২৪ ঘণ্টার মধ্যে অভিযোগ করুন","Quick reporting preserves medical evidence and CCTV footage.","দ্রুত অভিযোগ করলে চিকিৎসা প্রমাণ ও সিসিটিভি ফুটেজ সংরক্ষিত থাকে।",false,18),
        ("LEGAL","Ask for a GD copy","জিডির কপি চাইুন","A General Diary receipt is free and is your proof of reporting.","জেনারেল ডায়েরির রসিদ বিনামূল্যে পাওয়া যায় এবং এটিই অভিযোগের প্রমাণ।",false,19),
        ("LEGAL","You can get free legal aid","বিনামূল্যে আইনি সহায়তা পাওয়া যায়","Call 16432 for free legal aid from the National Legal Aid Services Board.","জাতীয় আইন সেবা কন্ট্রোল বোর্ড থেকে বিনামূল্যে সহায়তায় ১৬৪৩২ এ কল করুন।",false,20),
        ("MENTAL","Talk to someone you trust","বিশ্বস্ত কারও সাথে কথা বলুন","Suppression increases trauma. 109 and 106 are free and confidential.","চাপা দিলে ট্রমা বাড়ে। ১০৯ ও ১০৬ বিনামূল্য ও গোপনীয়।",false,21),
        ("MENTAL","Use the safety checklist at night","রাতে সেফটি চেকলিস্ট ব্যবহার করুন","Run the five-point checklist before leaving home after dark.","অন্ধকারের পর বাইরে যাওয়ার আগে পাঁচ বিন্দু চেকলিস্ট দেখুন।",true,22)
    };

    public static async Task RunAsync(WomenSafetyDbContext db)
    {
        await db.Database.EnsureCreatedAsync();

        if (!await db.Divisions.AnyAsync())
            await SeedBaseDataAsync(db);

        // Runs on every startup: no-op after the first (marker-guarded) directory seed,
        // so an existing database picks up the aggregated district directory in place.
        await DirectorySeedData.RunAsync(db);
    }

    /// <summary>
    /// Geography, national helplines, legal resources, safety tips and the anonymised
    /// demo data used by the public statistics screens. Only runs on an empty database.
    /// </summary>
    private static async Task SeedBaseDataAsync(WomenSafetyDbContext db)
    {
        var now = DateTimeOffset.UtcNow;
        var divisionMap = new Dictionary<string, Division>();
        foreach (var (code, bn, en) in Divisions)
        {
            var division = new Division { Id = Guid.NewGuid(), Code = code, NameBn = bn, NameEn = en };
            divisionMap[code] = division;
            db.Divisions.Add(division);
        }
        await db.SaveChangesAsync();

        var districtMap = new Dictionary<string, District>();
        foreach (var (div, code, bn, en, lat, lng) in Districts)
        {
            var district = new District
            {
                Id = Guid.NewGuid(),
                Code = code,
                NameBn = bn,
                NameEn = en,
                CenterLatitude = lat,
                CenterLongitude = lng,
                DivisionId = divisionMap[div].Id
            };
            districtMap[en] = district;
            db.Districts.Add(district);
        }
        await db.SaveChangesAsync();

        foreach (var (service, bn, number, category, noteEn, noteBn, order) in Numbers)
        {
            db.EmergencyNumberEntries.Add(new EmergencyNumberEntry
            {
                Id = Guid.NewGuid(),
                Service = service,
                ServiceBn = bn,
                Number = number,
                DialUri = $"tel:{number}",
                Category = category,
                NoteEn = noteEn,
                NoteBn = noteBn,
                Is24x7 = true,
                SortOrder = order
            });
        }

        foreach (var (titleEn, titleBn, category, law, sumEn, sumBn, phone, order) in Laws)
        {
            db.LegalResources.Add(new LegalResource
            {
                Id = Guid.NewGuid(),
                Category = category,
                TitleEn = titleEn,
                TitleBn = titleBn,
                SummaryEn = sumEn,
                SummaryBn = sumBn,
                LawReference = law,
                Phone = string.IsNullOrWhiteSpace(phone) ? null : phone,
                Website = category == LegalResourceCategory.LEGAL_AID ? "http://nlsb.gov.bd" : null,
                SortOrder = order
            });
        }

        foreach (var (cat, titleEn, titleBn, bodyEn, bodyBn, night, order) in Tips)
        {
            db.SafetyTips.Add(new SafetyTip
            {
                Id = Guid.NewGuid(),
                Category = cat,
                TitleEn = titleEn,
                TitleBn = titleBn,
                BodyEn = bodyEn,
                BodyBn = bodyBn,
                NightOnly = night,
                SortOrder = order,
                IsActive = true
            });
        }

        db.DataSources.Add(new DataSource
        {
            Id = Guid.NewGuid(),
            Name = "Bangladesh Government & BBS geography (demo seed)",
            SourceUrl = "https://bbs.gov.bd",
            VerificationStatus = VerificationStatus.VERIFIED_CASE,
            PublishedAt = now,
            IsDemoData = true
        });

        await db.SaveChangesAsync();

        await SeedDemoAccountsAsync(db, districtMap, now);
        await SeedDemoIncidentsAsync(db, districtMap, now);

        await db.SaveChangesAsync();
    }

    private static async Task SeedDemoAccountsAsync(WomenSafetyDbContext db, Dictionary<string, District> districts, DateTimeOffset now)
    {
        var dhaka = districts["Dhaka"];
        var chattogram = districts["Chattogram"];

        AppUser Make(string email, string phone, string name, UserRole role, District district, string lang)
            => new()
            {
                Id = Guid.NewGuid(),
                Email = email,
                PhoneNumber = phone,
                DisplayName = name,
                PasswordHash = PasswordHasher.Hash("Demo@1234"),
                Role = role,
                DistrictId = district.Id,
                DivisionId = district.DivisionId,
                PreferredLanguage = lang,
                IsEmailVerified = true,
                IsPhoneVerified = true,
                CreatedAt = now,
                UpdatedAt = now
            };

        db.AppUsers.AddRange(
            Make("victim@demo", "01700000001", "Rahima (Demo)", UserRole.VICTIM, dhaka, "bn"),
            Make("moderator@demo", "01700000002", "Moderator Demo", UserRole.MODERATOR, dhaka, "en"),
            Make("responder@demo", "01700000003", "Responder Demo", UserRole.RESPONDER, chattogram, "en"),
            Make("admin@demo", "01700000004", "Admin Demo", UserRole.ADMIN, dhaka, "en"));

        db.Responders.AddRange(
            new Responder { Id = Guid.NewGuid(), DisplayName = "Dhaka Volunteer Cell", PhoneNumber = "999", IsApproved = true, IsOnDuty = true, CenterLatitude = 23.8103, CenterLongitude = 90.4125, CoverageRadiusMeters = 8000, CreatedAt = now, UpdatedAt = now },
            new Responder { Id = Guid.NewGuid(), DisplayName = "Chattogram Volunteer Cell", PhoneNumber = "999", IsApproved = true, IsOnDuty = true, CenterLatitude = 22.3569, CenterLongitude = 91.7832, CoverageRadiusMeters = 8000, CreatedAt = now, UpdatedAt = now },
            new Responder { Id = Guid.NewGuid(), DisplayName = "Khulna Volunteer Cell", PhoneNumber = "999", IsApproved = true, IsOnDuty = false, CenterLatitude = 22.8098, CenterLongitude = 89.5644, CoverageRadiusMeters = 6000, CreatedAt = now, UpdatedAt = now },
            new Responder { Id = Guid.NewGuid(), DisplayName = "Sylhet Volunteer Cell", PhoneNumber = "999", IsApproved = true, IsOnDuty = true, CenterLatitude = 24.8949, CenterLongitude = 91.8687, CoverageRadiusMeters = 6000, CreatedAt = now, UpdatedAt = now });

        await db.SaveChangesAsync();
    }

    private static async Task SeedDemoIncidentsAsync(WomenSafetyDbContext db, Dictionary<string, District> districts, DateTimeOffset now)
    {
        var hotDistricts = new[]
        {
            "Dhaka", "Chattogram", "Khulna", "Rajshahi", "Sylhet",
            "Barishal", "Rangpur", "Mymensingh", "Gazipur", "Cumilla", "Cox's Bazar", "Narayanganj"
        };

        var categories = Enum.GetValues<IncidentCategory>();
        var statuses = new[]
        {
            IncidentStatus.OPEN, IncidentStatus.AWAITING_VERIFICATION, IncidentStatus.VERIFIED,
            IncidentStatus.POLICE_REFERRED, IncidentStatus.RESOLVED, IncidentStatus.CLOSED
        };

        var random = new Random(20261001);
        var anonymisedUser = "demo-seed";

        foreach (var districtName in hotDistricts)
        {
            var district = districts[districtName];
            var count = random.Next(14, 34);

            for (var i = 0; i < count; i++)
            {
                var createdAt = now.AddDays(-random.Next(0, 180)).AddMinutes(-random.Next(0, 1440));
                var status = statuses[random.Next(statuses.Length)];
                var category = categories[random.Next(categories.Length)];

                db.Incidents.Add(new EmergencyIncident
                {
                    Id = Guid.NewGuid(),
                    AnonymousUserId = anonymisedUser,
                    IdempotencyKey = $"seed-{district.Code}-{i}",
                    IncidentReference = $"WS-{district.Code}-{i:D3}",
                    IsEmergency = status == IncidentStatus.POLICE_REFERRED || random.Next(0, 5) == 0,
                    Status = status,
                    VerificationStatus = status is IncidentStatus.VERIFIED or IncidentStatus.POLICE_REFERRED or IncidentStatus.RESOLVED or IncidentStatus.CLOSED
                        ? VerificationStatus.VERIFIED_CASE
                        : VerificationStatus.PENDING_REVIEW,
                    PrivacyMode = EmergencyPrivacyMode.BALANCED,
                    Category = category,
                    Title = null,
                    Description = null,
                    DistrictId = district.Id,
                    DivisionId = district.DivisionId,
                    LastLatitude = district.CenterLatitude,
                    LastLongitude = district.CenterLongitude,
                    OccurredAt = createdAt.AddHours(-random.Next(1, 48)),
                    CreatedAt = createdAt,
                    UpdatedAt = createdAt
                });
            }
        }

        await db.SaveChangesAsync();
    }
}
