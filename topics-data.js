/* global window */
(() => {
  "use strict";

  /**
   * Topics: Arabic labels; each topic filters wordbank by `tag`.
   */
  const TOPIC_SECTIONS = [
    {
      id: "core",
      title: "الأساسيات",
      subtitle: "ابدأ من هنا — كلمات وأسئلة يومية.",
      topics: [
        {
          id: "basics",
          label: "تحيات وكلمات أساسية",
          blurb: "مرحبا، من فضلك، شكراً، نعم ولا.",
          tags: ["basics"],
        },
        {
          id: "numbers",
          label: "أرقام",
          blurb: "عدّ وأرقام ترتيبية.",
          tags: ["numbers"],
        },
        {
          id: "colors",
          label: "ألوان",
          blurb: "أحمر، أزرق، أخضر وغيرها.",
          tags: ["colors"],
        },
        {
          id: "time",
          label: "وقت وأيام",
          blurb: "اليوم، باجر، أيام الأسبوع والساعة.",
          tags: ["time"],
        },
        {
          id: "adjectives",
          label: "صفات",
          blurb: "كبير، صغير، زين، صعب.",
          tags: ["adjectives"],
        },
        {
          id: "verbs",
          label: "أفعال",
          blurb: "أفعال شائعة بصيغة يفعل.",
          tags: ["verbs"],
        },
      ],
    },
    {
      id: "home-life",
      title: "البيت والحياة",
      subtitle: "بيت، أكل، لبس وتسوق.",
      topics: [
        {
          id: "home",
          label: "البيت والأثاث",
          blurb: "غرف، أثاث ومطبخ.",
          tags: ["home"],
        },
        {
          id: "food",
          label: "أكل وشرب",
          blurb: "وجبات، مكونات ومطعم.",
          tags: ["food"],
        },
        {
          id: "clothes",
          label: "ملابس",
          blurb: "ملابس وأحذية.",
          tags: ["clothes"],
        },
        {
          id: "shopping",
          label: "تسوق وفلوس",
          blurb: "شراء، سعر ودفع.",
          tags: ["shopping"],
        },
        {
          id: "everyday",
          label: "أشياء يومية",
          blurb: "أغراض عامة في الحياة اليومية.",
          tags: ["everyday"],
        },
      ],
    },
    {
      id: "people",
      title: "ناس ومحادثة",
      subtitle: "عائلة، مشاعر وعبارات.",
      topics: [
        {
          id: "people",
          label: "عائلة وأشخاص",
          blurb: "أم، أب، صديق، رجل ومرة.",
          tags: ["people"],
        },
        {
          id: "feelings",
          label: "مشاعر",
          blurb: "فرحان، حزين، تعبان وغيرها.",
          tags: ["feelings"],
        },
        {
          id: "phrases",
          label: "عبارات مفيدة",
          blurb: "جمل قصيرة للمحادثة.",
          tags: ["phrases"],
        },
      ],
    },
    {
      id: "body-health",
      title: "جسم وصحة",
      subtitle: "جسم، عيادة ودواء.",
      topics: [
        {
          id: "body",
          label: "أعضاء الجسم",
          blurb: "رأس، يد، قلب وغيرها.",
          tags: ["body"],
        },
        {
          id: "health",
          label: "صحة وطب",
          blurb: "دكتور، مستشفى وألم.",
          tags: ["health"],
        },
      ],
    },
    {
      id: "world",
      title: "سفر وطبيعة",
      subtitle: "سفر، طقس، حيوانات وبيئة.",
      topics: [
        {
          id: "travel",
          label: "سفر ومواصلات",
          blurb: "مطار، تذكرة، سيارة وطريق.",
          tags: ["travel"],
        },
        {
          id: "weather",
          label: "طقس",
          blurb: "شمس، مطر، حار وبارد.",
          tags: ["weather"],
        },
        {
          id: "nature",
          label: "طبيعة",
          blurb: "شجر، بحر، جبل وحديقة.",
          tags: ["nature"],
        },
        {
          id: "animals",
          label: "حيوانات",
          blurb: "حيوانات أليفة وبرية.",
          tags: ["animals"],
        },
      ],
    },
    {
      id: "study-work",
      title: "دراسة وشغل",
      subtitle: "مدرسة، مكتب ومهنة.",
      topics: [
        {
          id: "school",
          label: "مدرسة ودراسة",
          blurb: "طالب، كتاب وامتحان.",
          tags: ["school"],
        },
        {
          id: "work",
          label: "شغل ومكتب",
          blurb: "وظيفة، اجتماع وراتب.",
          tags: ["work"],
        },
      ],
    },
    {
      id: "society",
      title: "مجتمع وتقنية",
      subtitle: "تقنية، إعلام، مجتمع ورياضة.",
      topics: [
        {
          id: "tech",
          label: "تقنية",
          blurb: "تلفون، نت وحاسوب.",
          tags: ["tech"],
        },
        {
          id: "media",
          label: "إعلام",
          blurb: "فيلم، أغنية وأخبار.",
          tags: ["media"],
        },
        {
          id: "civic",
          label: "مجتمع وقانون",
          blurb: "حكومة، شرطة وانتخابات.",
          tags: ["civic"],
        },
        {
          id: "sports",
          label: "رياضة",
          blurb: "كرة، فريق وملعب.",
          tags: ["sports"],
        },
      ],
    },
    {
      id: "yours",
      title: "كلماتك",
      subtitle: "كلمات أضفتها بنفسك في هذا المتصفح.",
      topics: [
        {
          id: "custom",
          label: "كلماتي الخاصة",
          blurb: "إضافاتك الشخصية.",
          tags: ["custom"],
        },
      ],
    },
  ];

  window.TOPIC_SECTIONS = TOPIC_SECTIONS;
  window.TOPIC_GROUPS = TOPIC_SECTIONS.flatMap((sec) => sec.topics);
})();
