(function (global) {
  'use strict';
  var UNREALIZED = global.UNREALIZED = global.UNREALIZED || {};
  UNREALIZED.nodes = UNREALIZED.nodes || {};

  // 第3章路線選擇完之後，依性別分流到兵役／提早職場節點
  var GENDER_GATE = [
    { when: { gender: 'M' }, next: 'n3m_military' },
    { next: 'n3f_headstart' }
  ];

  Object.assign(UNREALIZED.nodes, {

    // ---------------- 第 0 章：家庭起點 ----------------
    n0_family: {
      id: 'n0_family', chapter: 0, title: '家庭起點', ageRange: '0–10歲',
      text: '你還記不得太多事，但已經隱約知道家裡是什麼氣氛。',
      options: [
        {
          id: 'gov_family',
          label: '爸媽都是公教人員，家裡重視讀書，什麼事都要「說得出道理」',
          effects: { money: 1, achieve: 1, bond: -1 },
          flags: ['書香'],
          next: 'n1_bookish'
        },
        {
          id: 'labor_family',
          label: '家裡做小生意或在工廠做工，你很小就自己上下學、自己弄晚餐',
          effects: { money: -1, health: 1, self: 1 },
          flags: ['勞動', '早熟'],
          next: 'n1_labor'
        },
        {
          id: 'single_mom',
          label: '媽媽一個人把你跟弟妹拉拔大，錢永遠是那個沒說出口的緊張',
          effects: { money: -2, bond: 1, self: -1 },
          flags: ['單親', '責任'],
          next: 'n1_single'
        }
      ]
    },

    // ---------------- 第 1 章：國中 ----------------
    n1_bookish: {
      id: 'n1_bookish', chapter: 1, title: '國中', ageRange: '12–15歲',
      text: '書香家庭的期待很安靜，但一直都在。',
      options: [
        { id: 'push', label: '把所有時間都投入唸書，模擬考排名一次比一次前面', effects: { achieve: 2, health: -1, bond: -1 }, next: 'n2_high_school' },
        { id: 'hobby', label: '偷偷把零用錢存起來，去學一個爸媽不知道的興趣', effects: { self: 1, achieve: -1, money: -1 }, next: 'n2_high_school' },
        { id: 'skip', label: '有一天早上站在校門口，就是怎麼都不想走進去', effects: { self: 1, bond: -1, achieve: -1 }, next: 'n2_high_school' }
      ]
    },

    n1_labor: {
      id: 'n1_labor', chapter: 1, title: '國中', ageRange: '12–15歲',
      text: '沒有人特別盯著你的功課，日子要自己想辦法過。',
      options: [
        { id: 'self_taught', label: '沒人盯你，自己摸出一套讀書方法，不算頂尖但穩定', effects: { achieve: 1, self: 1, health: -1 }, next: 'n2_high_school' },
        { id: 'hang_out', label: '開始跟著朋友到處晃，考試前才臨時抱佛腳', effects: { bond: 1, achieve: -1, health: -1 }, next: 'n2_high_school' },
        { id: 'skill', label: '幫忙家裡生意時，發現自己對做東西有一種說不出的手感', effects: { achieve: 1, self: 1, money: -1 }, next: 'n2_high_school' },
        {
          id: 'factory',
          label: '家裡的攤子撐不下去了，國中一畢業，你就直接進工廠做工',
          requires: { generation: 1975 },
          effects: { money: 1, achieve: -2, health: -1, self: -1 },
          endingId: 'END_factory15'
        }
      ]
    },

    n1_single: {
      id: 'n1_single', chapter: 1, title: '國中', ageRange: '12–15歲',
      text: '媽媽從沒說過辛苦，但你看得出來。',
      options: [
        { id: 'scholarship', label: '把所有心力都放在考獎學金上，一分都不能浪費', effects: { achieve: 2, health: -1, bond: -1 }, next: 'n2_high_school' },
        { id: 'part_time', label: '放學後開始打工，把薪水拿回家貼補', effects: { money: 1, health: -1, self: -1 }, next: 'n2_high_school' },
        { id: 'bottle_up', label: '學會把心事都收起來，在媽媽面前永遠說「我很好」', effects: { self: -1, bond: 1, health: -1 }, next: 'n2_high_school' }
      ]
    },

    // ---------------- 第 2 章：十五到十八 ----------------
    n2_high_school: {
      id: 'n2_high_school', chapter: 2, title: '十五到十八', ageRange: '15–18歲',
      text: '{升學考試}的結果，把你分到了一條路上。',
      options: [
        {
          id: 'elite',
          label: [
            { when: { generation: 1975 }, text: '考上地區裡最好的高中，全家人拿你當範本說給親戚聽' },
            { when: { generation: 1990 }, text: '考上明星高中，但全班都跟你一樣是各校的第一名，排名瞬間變得殘酷' },
            { text: '把學習歷程做得又厚又漂亮，擠進了那間明星高中' }
          ],
          effects: { achieve: 2, bond: -1, health: -1 },
          flags: ['明星高中'],
          next: 'n3_route'
        },
        {
          id: 'normal',
          label: '上的是一間普通高中，日子過得平淡，沒有誰特別看你一眼',
          effects: { bond: 1, achieve: -1 },
          next: 'n3_route'
        },
        {
          id: 'vocational',
          label: [
            { when: { generation: 1975 }, text: '念了高工，學一個手上真的能用的技能，家裡覺得這樣比較實際' },
            { when: { generation: 1990 }, text: '身邊念高中的人比你多了不少，你選了技職，學一門手藝' },
            { text: '選了技職，身邊多數人都在拼學測，你選了另一條比較少人走的路' }
          ],
          effects: { achieve: 1, self: 1, bond: -1 },
          flags: ['技職'],
          next: 'n3_route'
        },
        {
          id: 'no_school',
          label: [
            { when: { generation: 1975 }, text: '沒有繼續升學，這在當時是很多人共同的選擇，沒什麼特別的' },
            { when: { generation: 1990 }, text: '班上繼續升學的人越來越多，沒念高中的你變成少數' },
            { text: '幾乎等於中途離開了升學這條路，老師特別找你談過幾次' }
          ],
          effects: { money: 1, achieve: -2, bond: -1 },
          flags: ['中離'],
          next: 'n3_route'
        }
      ]
    },

    // ---------------- 第 3 章：十八到二十二 ----------------
    n3_route: {
      id: 'n3_route', chapter: 3, title: '十八到二十二', ageRange: '18–22歲',
      text: '離開高中之後，路開始明顯分岔。',
      options: [
        { id: 'top_hot', label: '考上頂大的熱門科系，大家都說你以後不用愁', effects: { achieve: 2, self: -1, bond: -1 }, flags: ['頂大'], next: GENDER_GATE },
        { id: 'general_uni', label: '上了一間普通大學的普通科系，日子照著課表走', effects: { bond: 1, achieve: -1 }, next: GENDER_GATE },
        { id: 'liked_major', label: '選了自己真的喜歡的科系，雖然大家都問你以後要幹嘛', effects: { self: 2, money: -1, achieve: -1 }, flags: ['喜歡的科系'], next: GENDER_GATE },
        { id: 'vocational_college', label: '念了專科，提早一步進職場學東西', effects: { money: 1, achieve: -1, self: -1 }, next: GENDER_GATE },
        { id: 'direct_work', label: '沒有繼續念，直接進去工作，比同齡人早幾年開始存錢', effects: { money: 1, bond: -1, self: -1 }, next: GENDER_GATE }
      ]
    },

    n3m_military: {
      id: 'n3m_military', chapter: 3, title: '兵役', ageRange: '18–22歲',
      text: '接下來的{兵役長度}，你的世界從自己身上移開，移到一支部隊裡。',
      options: [
        { id: 'grit_through', label: '把情緒都收起來，只求平安退伍', effects: { achieve: -1, money: -1, self: -1 }, flags: ['壓抑'], next: 'n3_first_love' },
        { id: 'make_bonds', label: '退伍時多了幾個能講真心話的朋友', effects: { achieve: -1, money: -1, bond: 1 }, next: 'n3_first_love' },
        { id: 'find_clarity', label: '在被抽走自由的時間裡，意外想清楚了自己到底要什麼', effects: { achieve: -1, money: -1, self: 1 }, next: 'n3_first_love' }
      ]
    },

    n3f_headstart: {
      id: 'n3f_headstart', chapter: 3, title: '提早兩年', ageRange: '18–22歲',
      text: '同屆的男生還在當兵，你已經在職場上多磨了{兵役長度}的資歷。',
      options: [
        { id: 'lean_in', label: '順著家裡的期待，先把心力都放在工作上', effects: { achieve: 1, money: 1, self: -1 }, next: 'n3_first_love' },
        { id: 'push_back', label: '直接回嗆「我還沒想結婚」，氣氛僵了一陣子', effects: { achieve: 1, money: 1, bond: -1 }, next: 'n3_first_love' },
        { id: 'deflect', label: '用加班把「什麼時候穩定下來」這個話題撐過去', effects: { achieve: 1, money: 1, health: -1 }, next: 'n3_first_love' }
      ]
    },

    n3_first_love: {
      id: 'n3_first_love', chapter: 3, title: '第一次認真的關係', ageRange: '18–22歲',
      text: '這個階段，總會有一段關係，讓你第一次認真想到「我到底要跟誰過日子」。',
      options: [
        { id: 'straight_stable', label: '跟一個普通、穩定的人談了戀愛，很快就要決定要不要走下去', effects: { bond: 1, self: -1 }, next: 'n4_job' },
        { id: 'same_sex', label: '發現自己真正喜歡的是同性', effects: { self: 1, bond: -1 }, flags: ['同性伴侶'], next: 'n3_love_comingout' },
        { id: 'solo', label: '沒特別談戀愛，把時間都留給自己', effects: { self: 1, bond: -2 }, next: 'n4_job' }
      ]
    },

    n3_love_comingout: {
      id: 'n3_love_comingout', chapter: 3, title: '要不要說', ageRange: '18–22歲',
      text: [
        { when: { generation: 1975 }, text: '在你這一屆，這件事幾乎沒有「說出來」的空間。' },
        { when: { generation: 1990 }, text: '2019年，同婚通過的那一年，你剛好二十九歲。' },
        { text: '你從小就知道這是合法的，衝突已經從法律轉移到餐桌跟辦公室。' }
      ],
      options: [
        { id: '75_silent', requires: { generation: 1975 }, label: '決定誰都不說，讓大家以為你只是還沒「定下來」', effects: { self: -2, bond: 1 }, flags: ['未出櫃'], next: 'n4_job' },
        { id: '75_one_friend', requires: { generation: 1975 }, label: '只告訴一個你信任到底的朋友', effects: { bond: 1, self: -1 }, flags: ['未出櫃'], next: 'n4_job' },
        { id: '75_told_family', requires: { generation: 1975 }, label: '鼓起勇氣跟家裡說了，換來的是十年不再提起這件事', effects: { bond: -2, self: 1 }, flags: ['已出櫃'], next: 'n4_job' },

        { id: '90_registered', requires: { generation: 1990 }, label: '等到那一天，你們一起去戶政事務所登記', effects: { bond: 2, achieve: -1 }, flags: ['已出櫃'], next: 'n4_job' },
        { id: '90_family_ok', requires: { generation: 1990 }, label: '跟家裡出櫃，換來幾年的尷尬，但最後接受了', effects: { bond: -1, self: 1 }, flags: ['已出櫃'], next: 'n4_job' },
        { id: '90_partial', requires: { generation: 1990 }, label: '只在外面的世界出櫃，家裡那邊還沒打算說', effects: { self: -1, bond: 1 }, flags: ['未出櫃'], next: 'n4_job' },

        { id: '05_group_chat', requires: { generation: 2005 }, label: '在家庭群組裡直接說了，換來的是已讀不回三天', effects: { bond: -1, self: 1 }, flags: ['已出櫃'], next: 'n4_job' },
        { id: '05_workplace', requires: { generation: 2005 }, label: '在職場大方帶伴侶出席聚會，卻被「善意」排除在某些場合外', effects: { achieve: -1, self: 1 }, flags: ['已出櫃'], next: 'n4_job' },
        { id: '05_no_need', requires: { generation: 2005 }, label: '還沒打算對誰宣布，覺得這是自己的事，不需要誰批准', effects: { self: 1, bond: -1 }, flags: ['未出櫃'], next: 'n4_job' }
      ]
    }

  });
})(window);
