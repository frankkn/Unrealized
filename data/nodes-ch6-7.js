(function (global) {
  'use strict';
  var UNREALIZED = global.UNREALIZED = global.UNREALIZED || {};
  UNREALIZED.nodes = UNREALIZED.nodes || {};

  // 只有真的有小孩，才會遇到教養／親子關係結算節點；沒有就直接跳過
  var AFTER_UNEMPLOYMENT_NEXT = [
    { when: { flagsAll: ['有小孩'] }, next: 'n6_parenting' },
    { next: 'n6_long_term_care' }
  ];
  var AFTER_RETIREMENT_NEXT = [
    { when: { flagsAll: ['有小孩'] }, next: 'n7_children_settlement' },
    { next: 'n7_scam_call' }
  ];

  Object.assign(UNREALIZED.nodes, {

    // ---------------- 第 6 章：三十五到五十 · 清算開始 ----------------
    n6_career_plateau: {
      id: 'n6_career_plateau', chapter: 6, title: '事業高原', ageRange: '35–50歲',
      text: '你的職業生涯到了一個高原期，再往上，好像沒有位置留給你了。',
      options: [
        { id: 'accept', label: '接受這裡就是頂點，把心力挪去別的地方', effects: { self: 1, achieve: -1 }, next: 'n6_midlife_unemployment' },
        { id: 'push_more', label: '還是拼著想往上擠，結果換來更多失望', effects: { health: -1, self: -1 }, next: 'n6_midlife_unemployment' },
        { id: 'change_lane', label: '轉去一個新的領域重新開始，等於從頭來一次', effects: { achieve: -2, self: 1 }, next: 'n6_midlife_unemployment' }
      ]
    },

    n6_midlife_unemployment: {
      id: 'n6_midlife_unemployment', chapter: 6, title: '中年失業', ageRange: '35–50歲',
      text: '一次組織精簡，你的位置被劃掉了。',
      options: [
        { id: 'quick_reemploy', label: '很快找到下一份工作，但薪水打了折', effects: { bond: 1, money: -1, achieve: -1 }, next: AFTER_UNEMPLOYMENT_NEXT },
        { id: 'long_gap', label: '花了很長時間才找到下一份，存款一路在掉', effects: { money: -2, self: -1 }, next: AFTER_UNEMPLOYMENT_NEXT },
        { id: 'start_over', label: '利用這段空檔，做一件完全不一樣的事', effects: { self: 2, money: -1 }, next: AFTER_UNEMPLOYMENT_NEXT }
      ]
    },

    n6_parenting: {
      id: 'n6_parenting', chapter: 6, title: '教養', ageRange: '35–50歲',
      text: '孩子漸漸大了，你開始看見自己教養方式裡，那些從自己父母身上學來的痕跡。',
      options: [
        { id: 'repeat_pattern', label: '發現自己正在重複當年父母對你做的事，一時改不過來', effects: { bond: -1, self: -1 }, flags: ['複製教養'], next: 'n6_long_term_care' },
        { id: 'break_pattern', label: '努力練習用不一樣的方式對待孩子，很累，但你覺得值得', effects: { self: 1, health: -1 }, next: 'n6_long_term_care' },
        { id: 'outsource', label: '把大部分教養的事都交給補習班或安親班，自己專心賺錢', effects: { achieve: 1, money: -1, bond: -1 }, next: 'n6_long_term_care' }
      ]
    },

    n6_long_term_care: {
      id: 'n6_long_term_care', chapter: 6, title: '長照黑洞', ageRange: '35–50歲',
      text: '長輩的狀況持續了好幾年，沒有真正好轉的一天，你的生活開始繞著這件事打轉。',
      options: [
        { id: 'keep_caring', label: '繼續自己扛，幾乎沒有自己的時間', effects: { bond: 1, self: -2, achieve: -1 }, flags: ['照顧'], next: 'n6_marriage_crisis' },
        { id: 'share_siblings', label: '跟兄弟姐妹輪班分擔，但也因此吵了不少次', effects: { bond: -1, self: 1 }, flags: ['照顧'], next: 'n6_marriage_crisis' },
        { id: 'hire_full_time', label: '請了全天看護，把自己抽出來一部分', effects: { money: -2, self: 1 }, next: 'n6_marriage_crisis' }
      ]
    },

    n6_marriage_crisis: {
      id: 'n6_marriage_crisis', chapter: 6, title: '婚變', ageRange: '35–50歲',
      text: '多年下來累積的疲乏，在某一次爆發之後，關係走到了一個分岔點。',
      options: [
        { id: 'work_it_out', label: '決定去諮商，把話攤開來講', effects: { bond: 1, money: -1 }, next: 'n6_politics' },
        { id: 'separate', label: '決定分開，各自過各自的生活', effects: { bond: -2, self: 1 }, next: 'n6_politics' },
        { id: 'stay_for_kids', label: '為了孩子先不分開，把感情放到最後順位', effects: { self: -2, bond: 1 }, next: 'n6_politics' }
      ]
    },

    n6_politics: {
      id: 'n6_politics', chapter: 6, title: '餐桌上的戰場', ageRange: '35–50歲',
      text: [
        { when: { generation: 1975 }, text: '選舉、公投，或某場社會運動，把餐桌變成戰場，你跟長輩站在不同邊。' },
        { when: { generation: 1990 }, text: '你卡在中間，上一代跟下一代的立場都不太一樣，你哪邊都不太想選。' },
        { text: '你跟長輩在餐桌上，對同一件事有著完全不同的看法。' }
      ],
      options: [
        { id: 'fight', label: '吵到不再往來，一段時間沒再說話', effects: { bond: -2, self: 1 }, flags: ['家庭政治撕裂'], next: 'n6_financial_reckoning' },
        { id: 'silence', label: '選擇閉嘴吃飯，把話都吞回去', effects: { self: -1, bond: 1 }, next: 'n6_financial_reckoning' },
        { id: 'try_understand', label: '試著理解對方為什麼會這樣想，雖然還是很難', effects: { self: 1, health: -1 }, next: 'n6_financial_reckoning' }
      ]
    },

    n6_financial_reckoning: {
      id: 'n6_financial_reckoning', chapter: 6, title: '財務盤點', ageRange: '35–50歲',
      // 沒欠過錢的人不該看到「清算」——那是欠過的人才有的畫面
      text: [
        { when: { flagsAny: ['借貸', '高槓桿', '投機', '宗教金錢'] }, text: '這幾年欠的、借的、賭的，開始一筆一筆找上門。' },
        { text: '四十幾歲的某個晚上，你第一次把所有的帳攤開來，認真算了一次。' }
      ],
      options: [
        {
          id: 'foreclosure',
          requires: { generation: 1990, flagsAll: ['高槓桿'], attr: { key: 'money', op: '<=', value: 2 } },
          label: '法拍的通知，貼上了那間房子的門',
          effects: {},
          exemptRule: true,
          endingId: 'END_法拍'
        },
        // 催收電話只有真的欠過錢的人會遇到
        { id: 'collections_call', requires: { flagsAny: ['借貸', '高槓桿', '投機'] }, label: '催收電話開始一天打好幾次', effects: { self: -1, bond: -1 }, next: 'n6_health_reckoning' },
        { id: 'manage_through', label: '把手上的東西重新盤點一次，勉強打平', effects: { money: 1, health: -1 }, next: 'n6_health_reckoning' },
        { id: 'clean_sheet', requires: { flagsNone: ['高槓桿', '借貸'] }, label: '這幾年算是穩住了，沒有欠誰什麼', effects: { self: 1, achieve: -1 }, next: 'n6_health_reckoning' },
        { id: 'help_family', requires: { flagsNone: ['高槓桿', '借貸'] }, label: '手頭還算鬆，借了一筆給周轉不過來的家人', effects: { bond: 2, money: -2 }, next: 'n6_health_reckoning' }
      ]
    },

    n6_health_reckoning: {
      id: 'n6_health_reckoning', chapter: 6, title: '健康清算', ageRange: '35–50歲',
      text: [
        { when: { attr: { key: 'health', op: '<=', value: 2 } }, text: '某天早上你在辦公室站起來的時候，眼前黑了三秒。醫生說再這樣下去，就不是警告了。' },
        { text: '身體這幾年欠的債，也開始要還了。' }
      ],
      options: [
        // 健康見底時，這裡曾經只有「倒下」一個按鈕——遊戲把方向盤搶走，
        // 那正是最說教也最不甘心的設計。現在倒下仍然在，但它是你選的，不是被判的。
        {
          id: 'collapse',
          requires: { attr: { key: 'health', op: '<=', value: 2 } },
          label: '沒有停，手上的事還沒交代完',
          effects: {},
          exemptRule: true,
          endingId: [
            { when: { attr: { key: 'achieve', op: '>=', value: 7 } }, endingId: 'END_倒在辦公室' },
            { endingId: 'END_洗腎的日子' }
          ]
        },
        {
          id: 'full_stop',
          requires: { attr: { key: 'health', op: '<=', value: 2 } },
          label: '請了長假，把手上的位置交出去，先把身體救回來',
          effects: { health: 3, achieve: -2, money: -1 },
          next: 'n6_return_home'
        },
        { id: 'overwork_still', requires: { attr: { key: 'health', op: '>', value: 2 } }, label: '選擇繼續拼，反正還能撐', effects: { achieve: 1, health: -1 }, next: 'n6_return_home' },
        { id: 'slow_down', requires: { attr: { key: 'health', op: '>', value: 2 } }, label: '終於決定把腳步慢下來，重新排一次生活的順序', effects: { self: 1, health: 2, achieve: -2 }, next: 'n6_return_home' },
        { id: 'partial_care', requires: { attr: { key: 'health', op: '>', value: 2 } }, label: '開始固定看醫生、吃藥控制，但沒有完全改變生活方式', effects: { health: 1, self: -1 }, next: 'n6_return_home' }
      ]
    },

    n6_return_home: {
      id: 'n6_return_home', chapter: 6, title: '返鄉', ageRange: '35–50歲',
      text: '離鄉多年之後，父母老了，老家空了下來。',
      options: [
        { id: 'move_back', label: '決定搬回去，日子的步調整個慢了下來', effects: { bond: 1, health: 1, money: -1, achieve: -1 }, flags: ['返鄉'], next: 'n6_readjust' },
        { id: 'bring_them', label: '把父母接到你現在住的地方', effects: { bond: 1, self: -1 }, next: 'n6_readjust' },
        { id: 'commute', label: '選擇繼續兩地跑，哪邊都沒放下', effects: { achieve: 1, health: -1, bond: -1 }, next: 'n6_readjust' }
      ]
    },

    n6_readjust: {
      id: 'n6_readjust', chapter: 6, title: '重新調整', ageRange: '35–50歲',
      text: '走到這裡，你重新盤點了一次，自己現在真正在意的是什麼。',
      options: [
        { id: 'double_down', label: '決定把剩下的力氣，全部押在一件事上', effects: { achieve: 1, health: -1 }, next: 'n7_retirement_prep' },
        { id: 'let_go', label: '放掉了一些原本很在意的事，發現日子反而輕鬆一點', effects: { self: 1, health: 1, achieve: -1 }, next: 'n7_retirement_prep' },
        { id: 'keep_going', label: '沒有特別調整什麼，就是繼續往前走', effects: { bond: 1, self: -1 }, next: 'n7_retirement_prep' }
      ]
    },

    // ---------------- 第 7 章：五十歲之後 ----------------
    n7_retirement_prep: {
      id: 'n7_retirement_prep', chapter: 7, title: '退休準備', ageRange: '50歲以後',
      text: [
        { when: { generation: 2005 }, text: '超高齡社會，勞保這件事，大家心裡都有個問號，但問題不是新的——只是這次輪到你。' },
        { text: '退休金、勞保、存款，你開始認真算一次，接下來這幾十年夠不夠用。' }
      ],
      options: [
        { id: 'prepared', label: '這些年陸續準備了退休金，現在看起來還算夠用', effects: { money: 1, achieve: -1 }, next: AFTER_RETIREMENT_NEXT },
        { id: 'underprepared', label: '手上的錢，沒有你以為的那麼夠用', effects: { money: -2, self: -1 }, next: AFTER_RETIREMENT_NEXT },
        { id: 'keep_working', label: '決定不真正退休，能做多久就做多久', effects: { money: 1, health: -1 }, next: AFTER_RETIREMENT_NEXT }
      ]
    },

    n7_children_settlement: {
      id: 'n7_children_settlement', chapter: 7, title: '與孩子的關係結算', ageRange: '50歲以後',
      text: '孩子長大以後，你們的關係變成現在這個樣子，已經是某種定局。',
      options: [
        { id: 'close', label: '現在還是常聯絡，偶爾一起吃飯', effects: { bond: 2, self: -1 }, next: 'n7_scam_call' },
        { id: 'distant', label: '長大後很少回來，你不太確定具體是哪裡出了問題', effects: { bond: -2, self: -1 }, next: 'n7_scam_call' },
        { id: 'repaired', label: '曾經很僵，但這幾年慢慢又找回一些話可以說', effects: { bond: 1, health: -1 }, next: 'n7_scam_call' }
      ]
    },

    n7_scam_call: {
      id: 'n7_scam_call', chapter: 7, title: '詐騙電話', ageRange: '50歲以後',
      text: [
        { when: { generation: 2005 }, text: '電話那頭的聲音，是AI合成的家人語氣，聽起來比真人還急切。' },
        { text: '一通電話，對方聽起來很緊急，也很懂你在怕什麼。' }
      ],
      options: [
        { id: 'fall_for_it', label: '把一部分積蓄轉了出去，後來才知道是詐騙', effects: { money: -2, self: -1 }, next: 'n7_solo_aging' },
        { id: 'almost_fell', label: '差一點就信了，後來冷靜下來查證，及時退出', effects: { self: 1, health: -1 }, next: 'n7_solo_aging' },
        { id: 'recognize_immediately', label: '一聽就知道是詐騙，直接掛掉', effects: { self: 1, bond: -1 }, next: 'n7_solo_aging' }
      ]
    },

    n7_solo_aging: {
      id: 'n7_solo_aging', chapter: 7, title: '老後獨居', ageRange: '50歲以後',
      text: '你現在一個人住，大部分時間都是自己一個人。',
      options: [
        { id: 'thriving_alone', label: '把日子過得挺自在，一個人也有自己的節奏', effects: { self: 1, bond: -1 }, next: 'n7_body_ledger' },
        { id: 'lonely', label: '大部分時間都很安靜，安靜到有時候會嚇自己一下', effects: { bond: -1, health: -1 }, next: 'n7_body_ledger' },
        { id: 'community', label: '開始參加社區的活動，認識了一些新朋友，也跟著他們每天早上去走路', effects: { bond: 1, health: 1, money: -1 }, next: 'n7_body_ledger' }
      ]
    },

    n7_body_ledger: {
      id: 'n7_body_ledger', chapter: 7, title: '身體的餘額', ageRange: '50歲以後',
      text: '身體這本帳，到了這個年紀，已經不太可能再存回去，只能想辦法花得慢一點。',
      options: [
        { id: 'careful', label: '很小心地維持著現有的狀態，盡量不讓它變得更差', effects: { health: 1, self: -1 }, next: 'n7_look_back' },
        { id: 'indulge', label: '決定不要那麼小心，想吃想做的都做，反正日子有限', effects: { self: 1, health: -1 }, next: 'n7_look_back' },
        { id: 'decline', label: '這幾年，身體明顯走下坡，很多事已經做不到了', effects: { health: -2, bond: 1 }, next: 'n7_look_back' }
      ]
    },

    n7_look_back: {
      id: 'n7_look_back', chapter: 7, title: '回望', ageRange: '50歲以後',
      text: '存摺走到最後一頁，你把它整本翻回第一頁，重新看了一次。',
      options: [
        { id: 'accept', label: '大致接受了這一路走來的樣子', effects: { self: 1, achieve: -1 }, next: 'GAME_END' },
        { id: 'regret', label: '有些地方你還是會想，如果當初不一樣就好了', effects: { self: -1, bond: 1 }, next: 'GAME_END' },
        { id: 'proud', label: '為自己撐過來的這些年，感到一種安靜的驕傲', effects: { self: 2, bond: -1 }, next: 'GAME_END' }
      ]
    }

  });
})(window);
