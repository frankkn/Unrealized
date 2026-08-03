(function (global) {
  'use strict';
  var UNREALIZED = global.UNREALIZED = global.UNREALIZED || {};
  UNREALIZED.nodes = UNREALIZED.nodes || {};

  // 第5章就把日常負擔解掉的人（送機構），第6章那個「生活開始繞著這件事打轉」
  // 的長照節點對他不成立 —— 整個跳過。這個節點也是「照顧」旗標的唯一來源，
  // 無條件對每個人跑會讓那個旗標近乎人人有，下游讀它的判定就跟著失效。
  function longTermCareStillOnYou(state) {
    return !state.flags['送機構'];
  }
  var CARE_OR_SKIP = [
    { when: longTermCareStillOnYou, next: 'n6_long_term_care' },
    { when: relationshipUnderStrain, next: 'n6_marriage_crisis' },
    { next: 'n6_politics' }
  ];
  // 只有真的有小孩，才會遇到教養節點；沒有就直接進長照那一段的判斷
  var AFTER_UNEMPLOYMENT_NEXT = [
    { when: { flagsAll: ['有小孩'] }, next: 'n6_parenting' },
    { next: CARE_OR_SKIP }
  ];
  // 婚變的前提是「有一段關係」，而且那段關係真的在承受壓力。
  // 少了這個門檻，選過分手、或一路單身的人也會被告知「你的關係走到了分岔點」——
  // 那個節點的三個選項全都假設有伴侶，讀起來會完全不知所云。
  function relationshipUnderStrain(state) {
    if (!state.flags['成家'] && !state.flags['未婚']) return false;
    // 條件只看關係本身有沒有真的被磨掉。
    //
    // 原本還接受「achieve >= 7」與「有照顧旗標」，兩個後來都失效了：
    // 取消「提升必有犧牲」之後成就中位數變成 9，achieve>=7 於是 100% 成立；
    // 而長照節點無條件對每個人跑、三個選項有兩個蓋上「照顧」。三個條件 OR 起來
    // 等於沒有條件 —— 有伴侶的人 100% 會遇到婚變，這個事件也就不再是事件。
    //
    // 只留 bond <= 3 之後，區辨力反而最好：一直維持關係的玩法 0%，
    // 真的疏忽了關係的 100%，兼顧的落在五成上下。
    return state.attrs.bond <= 3;
  }
  var AFTER_CARE_NEXT = [
    { when: relationshipUnderStrain, next: 'n6_marriage_crisis' },
    { next: 'n6_politics' }
  ];

  // 財務盤點只在錢真的值得一提的時候才發生：欠過、或很緊、或寬裕到有人來借。
  // 不上不下的人不會在四十幾歲的某個晚上突然把帳全部攤開來算。
  //
  // 第二版：原本是「三個旗標 或 money<=3 或 money>=7」，只有 money 4–6 且乾乾淨淨的人
  // 躲得掉 —— 89% 的局都會遇到，等於固定行程。兩個問題：
  //   · `money>=7` 這一支是為了「寬裕到有人來借你錢」寫的，但**節點裡沒有那一版敘述**。
  //     門檻放行了一種情況，文字卻沒有寫給它——那就不該放行。
  //   · 欠過錢的旗標會一路留著。money 到 9 的人早就還完了，
  //     「這幾年欠的、借的、賭的，開始一筆一筆找上門」對他不成立。
  // 跟 n5_debt、中年失業同一個三段式。
  function moneyIsNotable(state) {
    // 「宗教金錢」不算在內：那個旗標講的是你把別人拉下水，是關係的帳，
    // 由「拉進去的人」那個結局承接，不是你自己的資產負債表
    if (state.attrs.money <= 3) return true;
    if (state.attrs.money >= 8) return false;
    return !!(state.flags['借貸'] || state.flags['高槓桿'] || state.flags['投機']);
  }
  var AFTER_POLITICS_NEXT = [
    { when: moneyIsNotable, next: 'n6_financial_reckoning' },
    { next: 'n6_health_reckoning' }
  ];

  // 「你的位置被劃掉了」不是每個人都會遇到。被裁的是位置不穩的人：
  // 成就沒真的累積起來，或已經被時代／技術打過一次。
  // 「被取代」對 2005 世代是 100%（第4章那個節點三個選項都會蓋），單看旗標
  // 等於整個世代必定失業。所以先看成就：真的做起來的人這關過得去，
  // 位置本來就不穩的人躲不掉，中間那一段才由旗標決定。
  function layoffReachesYou(state) {
    if (state.attrs.achieve <= 5) return true;
    if (state.attrs.achieve >= 8) return false;
    return !!(state.flags['被取代'] || state.flags['遇到風暴']);
  }
  var UNEMPLOYMENT_OR_SKIP = [
    { when: layoffReachesYou, next: 'n6_midlife_unemployment' },
    { next: AFTER_UNEMPLOYMENT_NEXT }
  ];

  // 五十歲以後是不是一個人住：分開了、或本來就沒有過伴侶
  function livesAloneNow(state) {
    // 「單身」要排在前面：同性伴侶分手之後那個旗標仍然留著（好幾個結局讀它），
    // 只看伴侶類旗標會判成「有人陪」
    if (state.flags['分開'] || state.flags['單身']) return true;
    return !state.flags['成家'] && !state.flags['同性伴侶'] && !state.flags['未婚'];
  }
  function notAlone(state) { return !livesAloneNow(state); }

  // 「離鄉多年之後，父母老了，老家空了下來」——留在家鄉附近的人沒有這一段
  function everLeftHome(state) {
    return !!(state.flags['北漂'] || state.flags['出國'] || state.flags['西進'] || state.flags['移民']);
  }
  var RETURN_OR_SKIP = [
    { when: everLeftHome, next: 'n6_return_home' },
    { next: 'n6_readjust' }
  ];

  // 「一個老朋友打來」——前提是還有人有你的號碼。
  // 十八歲就讓那群人一個一個散掉的人，這通電話不會響。
  function someoneStillHasYourNumber(state) {
    return !!(state.flags['死黨'] || state.flags['人面廣']);
  }
  var FRIEND_OR_SKIP = [
    { when: someoneStillHasYourNumber, next: 'n6_old_friend' },
    { next: 'n6_parent_dies' }
  ];

  var AFTER_RETIREMENT_NEXT = [
    { when: { flagsAll: ['有小孩'] }, next: 'n7_children_settlement' },
    { next: 'n7_scam_call' }
  ];

  Object.assign(UNREALIZED.nodes, {

    // ---------------- 第 6 章：三十五到五十 · 清算開始 ----------------
    n6_career_plateau: {
      id: 'n6_career_plateau', chapter: 6, title: '事業高原', ageRange: '35–50歲',
      text: [
        // 回聲：第4章選的那條路，到這裡各自長成不同的天花板
        { when: { flagsAll: ['收手'] }, text: '再往上你也想過，但你這輩子在那次之後，就很少再讓自己那樣投入一件事了。' },
        { when: { flagsAll: ['再試一次'] }, text: '你的職業生涯到了高原期。十七歲那年你隔年再試了一次，這次的問題是還有沒有隔年。' },
        { when: { flagsAll: ['接案'] }, text: '你這輩子沒有在同一間公司待超過三年。自由是真的，只是沒有人會來跟你談升遷。' },
        { when: { flagsAll: ['公職'] }, text: '你的位置很穩，穩到你看得見自己十年後在哪一格。前面那幾個人，一個都還沒有要退。' },
        { when: { generation: 1975 }, text: '你在公司已經算資深，但上面那幾個位置，人都還沒有要退的意思。' },
        { when: { generation: 2005 }, text: '你的職位在幾次自動化之後被重新定義了兩遍，現在你很難跟家人解釋自己到底在做什麼。' },
        { text: '你的職業生涯到了一個高原期，再往上，好像沒有位置留給你了。' }
      ],
      options: [
        { id: 'accept', label: '接受這裡就是頂點，把心力挪去別的地方', effects: { self: 1, bond: 1 }, next: UNEMPLOYMENT_OR_SKIP },
        { id: 'push_more', label: '還是拼著想往上擠，結果換來更多失望', effects: { health: -1, self: -1 }, next: UNEMPLOYMENT_OR_SKIP },
        { id: 'change_lane', label: '轉去一個新的領域重新開始，等於從頭來一次', effects: { achieve: -2, self: 1 }, next: UNEMPLOYMENT_OR_SKIP },
        // 有回報的選項刻意設成「要先投入過才看得到」——不是白送，是兌現
        { id: 'headhunted', requires: { attr: { key: 'achieve', op: '>=', value: 5 } }, label: '以前的同事來找你，那邊剛好缺一個你這種資歷的人', effects: { achieve: 2, money: 1 }, next: UNEMPLOYMENT_OR_SKIP }
      ]
    },

    n6_midlife_unemployment: {
      id: 'n6_midlife_unemployment', chapter: 6, title: '中年失業', ageRange: '35–50歲',
      text: [
        { when: { generation: 1975 }, text: '公司說要精簡人事。你四十幾歲，履歷上只有這一家。' },
        { when: { generation: 2005 }, text: '這次不是精簡——是整個職能被一套系統接手了。公司很客氣，還幫你報名了轉職課程。' },
        { text: '一次組織精簡，你的位置被劃掉了。' }
      ],
      options: [
        { id: 'quick_reemploy', label: '很快找到下一份工作，但薪水打了折', effects: { bond: 1, money: -1, achieve: -1 }, next: AFTER_UNEMPLOYMENT_NEXT },
        { id: 'long_gap', label: '花了很長時間才找到下一份，存款一路在掉', effects: { money: -2, self: -1 }, next: AFTER_UNEMPLOYMENT_NEXT },
        { id: 'start_over', label: '利用這段空檔，做一件完全不一樣的事，後來真的做起來了', effects: { self: 2, achieve: 1, money: -1 }, next: AFTER_UNEMPLOYMENT_NEXT }
      ]
    },

    n6_parenting: {
      id: 'n6_parenting', chapter: 6, title: '教養', ageRange: '35–50歲',
      text: [
        { when: { generation: 2005 }, text: '孩子的成長紀錄從出生就存在雲端，每一天你都翻得到。翻到某一年你忽然發現，自己講的話跟當年父母講的一模一樣。' },
        { text: '孩子漸漸大了，你開始看見自己教養方式裡，那些從自己父母身上學來的痕跡。' }
      ],
      options: [
        { id: 'repeat_pattern', label: '發現自己正在重複當年父母對你做的事，一時改不過來', effects: { bond: -1, self: -1 }, flags: ['複製教養'], next: CARE_OR_SKIP },
        { id: 'break_pattern', label: '努力練習用不一樣的方式對待孩子，很累，但你覺得值得', effects: { self: 1, health: -1 }, next: CARE_OR_SKIP },
        { id: 'outsource', label: '把大部分教養的事都交給補習班或安親班，自己專心賺錢', effects: { achieve: 1, money: -1, bond: -1 }, next: CARE_OR_SKIP }
      ]
    },

    n6_long_term_care: {
      id: 'n6_long_term_care', chapter: 6, title: '長照黑洞', ageRange: '35–50歲',
      text: [
        { when: { flagsAll: ['請看護'] }, text: '看護請了好幾年，長輩的狀況一直沒有真正好轉。錢每個月照付，你也一直在旁邊，只是那件事從來沒有結束的一天。' },
        { when: { generation: 2005 }, text: '照顧機器人翻身翻得比人穩，該吃的藥一次都沒漏。但長輩要的不是那個——他還是在等你來。' },
        { text: '長輩的狀況持續了好幾年，沒有真正好轉的一天，你的生活開始繞著這件事打轉。' }
      ],
      options: [
        { id: 'keep_caring', label: '繼續自己扛，幾乎沒有自己的時間', effects: { bond: 1, self: -2, achieve: -1 }, flags: ['照顧'], next: AFTER_CARE_NEXT },
        { id: 'share_siblings', requires: { flagsAll: ['有手足'] }, label: '跟兄弟姐妹輪班分擔，但也因此吵了不少次', effects: { bond: -1, self: 1 }, flags: ['照顧', '手足有分擔'], next: AFTER_CARE_NEXT },
        { id: 'siblings_vanished', requires: { flagsAll: ['有手足'] }, label: '兄弟姐妹一個一個有事，到最後還是只有你在', effects: { bond: -2, self: -1 }, flags: ['照顧', '手足沒出現'], next: AFTER_CARE_NEXT },
        { id: 'hire_full_time', label: '請了全天看護，把自己抽出來一部分', effects: { money: -2, self: 1 }, next: AFTER_CARE_NEXT }
      ]
    },

    n6_marriage_crisis: {
      id: 'n6_marriage_crisis', chapter: 6, title: '婚變', ageRange: '35–50歲',
      text: '多年下來累積的疲乏，在某一次爆發之後，關係走到了一個分岔點。',
      options: [
        { id: 'work_it_out', label: '決定去諮商，把話攤開來講', effects: { bond: 1, money: -1 }, next: 'n6_politics' },
        { id: 'separate', label: '決定分開，各自過各自的生活', effects: { bond: -2, self: 1 }, flags: ['分開'], next: 'n6_politics' },
        { id: 'stay_for_kids', label: '為了孩子先不分開，把感情放到最後順位', effects: { self: -2, bond: 1 }, next: 'n6_politics' }
      ]
    },

    n6_politics: {
      id: 'n6_politics', chapter: 6, title: '餐桌上的戰場', ageRange: '35–50歲',
      text: [
        { when: { generation: 1975 }, text: '選舉、公投，或某場社會運動，把餐桌變成戰場，你跟長輩站在不同邊。那個年代表達意見的方式是{抗議方式}。' },
        { when: { generation: 1990 }, text: '你卡在中間，上一代跟下一代的立場都不太一樣，你哪邊都不太想選。' },
        { text: '你跟長輩在餐桌上，對同一件事有著完全不同的看法。你們的消息來自不同地方——你這邊是{資訊來源}；而{長輩溝通方式}，也一直沒有對過頻。' }
      ],
      options: [
        { id: 'fight', label: '吵到不再往來，一段時間沒再說話', effects: { bond: -2, self: 1 }, flags: ['家庭政治撕裂'], next: AFTER_POLITICS_NEXT },
        { id: 'silence', label: '選擇閉嘴吃飯，把話都吞回去', effects: { self: -1, bond: 1 }, next: AFTER_POLITICS_NEXT },
        { id: 'try_understand', label: '試著理解對方為什麼會這樣想，雖然還是很難', effects: { self: 1, health: -1 }, next: AFTER_POLITICS_NEXT }
      ]
    },

    n6_financial_reckoning: {
      id: 'n6_financial_reckoning', chapter: 6, title: '財務盤點', ageRange: '35–50歲',
      // 沒欠過錢的人不該看到「清算」——那是欠過的人才有的畫面
      text: [
        { when: { flagsAny: ['借貸', '高槓桿', '投機'] }, text: '這幾年欠的、借的、賭的，開始一筆一筆找上門。' },
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
        { id: 'clean_sheet', requires: { flagsNone: ['高槓桿', '借貸'] }, label: '這幾年算是穩住了，沒有欠誰什麼', effects: { self: 1, money: 1 }, next: 'n6_health_reckoning' },
        { id: 'help_family', requires: { flagsNone: ['高槓桿', '借貸'] }, label: '手頭還算鬆，借了一筆給周轉不過來的家人', effects: { bond: 2, money: -2 }, next: 'n6_health_reckoning' }
      ]
    },

    n6_health_reckoning: {
      id: 'n6_health_reckoning', chapter: 6, title: '健康清算', ageRange: '35–50歲',
      text: [
        { when: { flagsAll: ['自責'], attr: { key: 'health', op: '<=', value: 2 } }, text: '某天早上你在辦公室站起來的時候，眼前黑了三秒。第一個念頭是自己怎麼把身體搞成這樣——你一直都是這樣想事情的。' },
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
          effects: { health: 3, self: 1, achieve: -1 },
          next: 'n6_return_home'
        },
        { id: 'overwork_still', requires: { attr: { key: 'health', op: '>', value: 2 } }, label: '選擇繼續拼，反正還能撐', effects: { achieve: 1, health: -1 }, next: RETURN_OR_SKIP },
        { id: 'slow_down', requires: { attr: { key: 'health', op: '>', value: 2 } }, label: '終於決定把腳步慢下來，重新排一次生活的順序', effects: { self: 1, health: 2 }, next: RETURN_OR_SKIP },
        { id: 'partial_care', requires: { attr: { key: 'health', op: '>', value: 2 } }, label: '開始固定看醫生、吃藥控制，但沒有完全改變生活方式', effects: { health: 1, self: -1 }, next: RETURN_OR_SKIP }
      ]
    },

    n6_return_home: {
      id: 'n6_return_home', chapter: 6, title: '返鄉', ageRange: '35–50歲',
      text: [
        { when: { flagsAll: ['移民'] }, text: '你在另一個國家的第八年，家裡打電話來說父母的身體不行了。飛回來要轉兩趟，簽證還得重辦。' },
        { when: { flagsAll: ['單親', '責任'] }, text: '媽媽老了。你從十幾歲就在幫她扛，這件事沒有哪一年真的結束過，只是這次換了一種扛法。' },
        { when: { flagsAll: ['單親'] }, text: '媽媽老了。你這輩子欠她的那些年，現在輪到你有機會還一點回去。' },
        { when: { flagsAll: ['北漂'] }, text: '你在這個城市住了二十年，還是覺得隨時可以打包走人。老家那邊，父母老了。' },
        { when: { generation: 1975 }, text: '離鄉多年之後，父母老了。那條街上的店一間一間換成你不認識的招牌，只有你家那扇門還是原來的。' },
        { when: { generation: 2005 }, text: '老家那一帶這幾年淹過兩次，留下來的人不多了。父母還是不肯搬。' },
        { text: '離鄉多年之後，父母老了，老家空了下來。' }
      ],
      options: [
        { id: 'move_back', requires: { flagsNone: ['移民'] }, label: '決定搬回去，日子的步調整個慢了下來', effects: { bond: 1, health: 1, money: -1, achieve: -1 }, flags: ['返鄉'], next: 'n6_readjust' },
        { id: 'move_back_home', requires: { flagsAll: ['移民'] }, label: '把那邊的一切收掉，搬回來', effects: { bond: 2, health: 1, money: -2, achieve: -1 }, flags: ['返鄉'], next: 'n6_readjust' },
        { id: 'bring_them', label: '把父母接到你現在住的地方', effects: { bond: 1, self: -1 }, next: 'n6_readjust' },
        { id: 'commute', label: '選擇繼續兩地跑，哪邊都沒放下', effects: { achieve: 1, money: -1, bond: -1 }, next: 'n6_readjust' }
      ]
    },

    n6_readjust: {
      id: 'n6_readjust', chapter: 6, title: '重新調整', ageRange: '35–50歲',
      text: [
        { when: { flagsAll: ['老么'] }, text: '走到這裡你重新盤點了一次。你一直是家裡最晚被要求長大的那個，而那個緩衝，好像在某一年就沒有了。' },
        { when: { flagsAll: ['排中間'] }, text: '走到這裡你重新盤點了一次。你這輩子很會不吵，會到後來連自己想要什麼都要想很久。' },
        { when: { flagsAll: ['休息過'] }, text: '走到這裡你重新盤點了一次。三十歲那年你停下來的那一整年，是這輩子唯一一次真的把時間留給自己。' },
        { when: { flagsAll: ['好運'] }, text: '走到這裡你重新盤點了一次。你很清楚有一段是運氣，也很清楚運氣不會再來第二次。' },
        { when: { flagsAll: ['被看見'] }, text: '走到這裡你重新盤點了一次。當年那個老師看見的東西，你這些年到底有沒有真的長出來。' },
        { when: { flagsAll: ['被否定'] }, text: '走到這裡你重新盤點了一次。你發現自己一路在證明的，其實是三十年前那句話說錯了。' },
        { when: { flagsAll: ['書香'] }, text: '走到這裡你重新盤點了一次。從小到大你都在符合某一種期待，這是第一次你認真問，那到底是不是你要的。' },
        { when: { flagsAll: ['勞動'] }, text: '走到這裡你重新盤點了一次。小時候家裡教你的是先做再說，做到這個年紀你才有空停下來想一下。' },
        { when: { flagsAll: ['早熟'] }, text: '走到這裡你重新盤點了一次。你從很小就在替別人打算，算到現在才輪到自己。' },
        { text: '走到這裡，你重新盤點了一次，自己現在真正在意的是什麼。' }
      ],
      options: [
        { id: 'double_down', label: '決定把剩下的力氣，全部押在一件事上', effects: { achieve: 1, bond: -1 }, next: FRIEND_OR_SKIP },
        { id: 'let_go', label: '放掉了一些原本很在意的事，發現日子反而輕鬆一點', effects: { self: 1, health: 1 }, next: FRIEND_OR_SKIP },
        { id: 'keep_going', label: '沒有特別調整什麼，就是繼續往前走', effects: { achieve: 1, bond: 1, money: -1, self: -1 }, next: FRIEND_OR_SKIP }
      ]
    },

    // 照顧那條線原本沒有收束：第5章父母生病、第6章長照，然後就沒有下文了。
    // 這個節點不加條件——父母會走，是這個年紀唯一真的每個人都會遇到的事。
    // 友誼那條線在中年的結算：朋友不會像家人一樣自動留在你的生活裡，
    // 到這個年紀還在的，都是有人主動維持過的
    n6_old_friend: {
      id: 'n6_old_friend', chapter: 6, title: '很久沒接到的那通電話', ageRange: '35–50歲',
      text: [
        { when: { flagsAll: ['死黨'] }, text: '那個什麼都跟他說過的人，這幾年你們各忙各的。這天他打來，開場白繞了很久才講到重點。' },
        { when: { flagsAll: ['人面廣'] }, text: '一個很多年沒聯絡的名字跳出來。你想了三秒才想起他是誰，然後他開口借錢。' },
        { text: '一個老朋友打來。寒暄了幾句之後，你聽出他其實是有事。' }
      ],
      options: [
        { id: 'lent_money', label: '借了。那筆錢後來誰都沒有再提起', effects: { money: -2, bond: 1 }, flags: ['借錢給朋友'], next: 'n6_parent_dies' },
        { id: 'said_no', label: '你說不方便。那之後你們就很少聯絡了', effects: { money: 1, bond: -2 }, flags: ['朋友走散'], next: 'n6_parent_dies' },
        { id: 'showed_up', label: '你沒借錢，但你去了，陪他把事情一件一件處理完', effects: { bond: 2, self: 1, health: -1 }, flags: ['交情還在'], next: 'n6_parent_dies' },
        { id: 'kept_it_light', label: '你聽完，說了些場面話，然後兩邊都當作沒事', effects: { self: -1, bond: -1 }, next: 'n6_parent_dies' }
      ]
    },

    n6_parent_dies: {
      id: 'n6_parent_dies', chapter: 6, title: '那通電話', ageRange: '35–50歲',
      text: [
        { when: { flagsAll: ['手足有分擔'] }, text: '這幾年你們輪班輪出了默契。清晨四點的電話，是排到今晚的那個人打來的。' },
        { when: { flagsAll: ['家庭政治撕裂'] }, text: '你們為了那件事吵到快兩年沒說話。清晨四點的電話打來的時候，你發現自己還記得他的號碼。' },
        { when: { flagsAll: ['照顧'] }, text: '照顧了那麼久，最後那通電話還是在清晨四點響起。你比自己以為的更早接起來。' },
        { when: { flagsAll: ['送機構'] }, text: '機構在清晨四點打來。你上一次去看，是三個星期前的事了。' },
        { when: { flagsAll: ['返鄉'] }, text: '你就睡在隔壁房間。清晨四點，你聽見的不是聲音，是突然安靜下來。' },
        { text: '清晨四點的電話。你聽完第一句就知道，接下來這幾天要怎麼過了。' }
      ],
      options: [
        { id: 'was_there', label: '你在旁邊，最後那幾天沒有離開', effects: { bond: 1, self: 1, health: -1 }, flags: ['送走父母'], next: 'n7_retirement_prep' },
        { id: 'too_late', label: '你趕過去的時候，已經來不及了', effects: { self: -2, bond: -1, achieve: 1 }, flags: ['送走父母', '來不及'], next: 'n7_retirement_prep' },
        { id: 'relief_and_guilt', label: '你先感覺到的是鬆一口氣，然後為那個鬆一口氣自責很久', effects: { health: 1, self: -1, bond: -1 }, flags: ['送走父母'], next: 'n7_retirement_prep' },
        { id: 'handled_it', label: '你把後事一件一件辦完，等到全部結束才敢坐下來', effects: { achieve: 1, bond: 1, health: -1, self: -1 }, flags: ['送走父母', '撐住了'], next: 'n7_retirement_prep' },
        { id: 'estate_fight', requires: { flagsAll: ['有手足'] }, label: '喪事還沒辦完，房子怎麼分就先吵了起來', effects: { money: 1, bond: -2, self: -1 }, flags: ['送走父母', '手足決裂'], next: 'n7_retirement_prep' },
        { id: 'estate_ok', requires: { flagsAll: ['有手足'] }, label: '你們把該分的分完，該說的說開，兄弟姐妹沒有散', effects: { bond: 2, money: -1, self: 1 }, flags: ['送走父母', '手足還在'], next: 'n7_retirement_prep' }
      ]
    },

    // ---------------- 第 7 章：五十歲之後 ----------------
    n7_retirement_prep: {
      id: 'n7_retirement_prep', chapter: 7, title: '退休準備', ageRange: '50歲以後',
      text: [
        { when: { flagsAll: ['接案'] }, text: '你這輩子沒有雇主，也就沒有人幫你提撥。這幾十年要靠什麼，全部寫在你自己那張表上。' },
        { when: { flagsAll: ['公職'] }, text: '你的退休金是這一輩子最穩的一件事，穩到年金改革吵起來的時候，你不太敢在同學會上提。' },
        { when: { generation: 2005 }, text: '超高齡社會，勞保這件事，大家心裡都有個問號，但問題不是新的——只是這次輪到你。' },
        { text: '退休金、勞保、存款，你開始認真算一次，接下來這幾十年夠不夠用。在你這一代，退休保障是{退休保障}。' }
      ],
      options: [
        { id: 'prepared', label: '這些年陸續準備了退休金，現在看起來還算夠用', effects: { money: 1, health: 1, self: -1 }, next: AFTER_RETIREMENT_NEXT },
        { id: 'underprepared', label: '手上的錢，沒有你以為的那麼夠用', effects: { money: -2, self: -1 }, next: AFTER_RETIREMENT_NEXT },
        { id: 'keep_working', label: '決定不真正退休，能做多久就做多久', effects: { money: 1, health: -1 }, next: AFTER_RETIREMENT_NEXT }
      ]
    },

    n7_children_settlement: {
      id: 'n7_children_settlement', chapter: 7, title: '與孩子的關係結算', ageRange: '50歲以後',
      text: [
        { when: { generation: 2005 }, text: '孩子在另一個時區工作。你們每週固定通話，畫面很清楚，話題很少。' },
        { text: '孩子長大以後，你們的關係變成現在這個樣子，已經是某種定局。' }
      ],
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
      id: 'n7_solo_aging', chapter: 7, title: '老後的日子', ageRange: '50歲以後',
      // 原本標題是「老後獨居」，敘述直接寫「你現在一個人住」，但這個節點對每個人都跑——
      // 成家、有小孩、bond 9 的人也會被告知他獨居（6000 局裡有 555 局）。
      // 老後是每個人都有的一段，獨居不是；所以節點留著，分成兩種老後。
      text: [
        { when: livesAloneNow, text: [
            { when: { generation: 1975 }, text: '同一條巷子裡，剩下的老鄰居也都一個人住了。你們偶爾在門口點個頭。' },
            { when: { generation: 2005 }, text: '這棟樓一半的門後面都是一個人。管理室每天早上確認一次，有沒有人到中午還沒開門。' },
            { text: '你現在一個人住，大部分時間都是自己一個人。' }
          ] },
        { when: { generation: 2005 }, text: '兩個人的作息都慢了下來。這棟樓一半的門後面是一個人，你們算是少數。' },
        { text: '工作退了，該忙的都忙完了，家裡剩下你們兩個，日子重新安靜下來。' }
      ],
      options: [
        { id: 'thriving_alone', requires: livesAloneNow, label: '把日子過得挺自在，一個人也有自己的節奏', effects: { self: 1, bond: -1 }, next: 'n7_body_ledger' },
        { id: 'lonely', requires: livesAloneNow, label: '大部分時間都很安靜，安靜到有時候會嚇自己一下', effects: { bond: -1, health: -1 }, next: 'n7_body_ledger' },
        { id: 'comfortable_silence', requires: notAlone, label: '兩個人的安靜變成一種默契，不用講話也知道對方在哪一間', effects: { bond: 1, self: 1 }, next: 'n7_body_ledger' },
        { id: 'same_roof', requires: notAlone, label: '同一個屋簷下，你們各過各的，話一年比一年少', effects: { bond: -1, self: -1 }, next: 'n7_body_ledger' },
        { id: 'community', label: '開始參加社區的活動，認識了一些新朋友，也跟著他們每天早上去走路', effects: { bond: 1, health: 1, money: -1 }, next: 'n7_body_ledger' },
        { id: 'they_stayed', requires: { flagsAny: ['死黨', '交情還在'] }, label: '老朋友還在，而且這幾年變成固定每個月約一次', effects: { bond: 2, self: 1 }, next: 'n7_body_ledger' }
      ]
    },

    n7_body_ledger: {
      id: 'n7_body_ledger', chapter: 7, title: '身體的餘額', ageRange: '50歲以後',
      text: [
        { when: { generation: 2005 }, text: '現在能延長的年份比你父母那一代多得多。只是沒有人跟你保證，延長的是哪一段。' },
        { text: '身體這本帳，到了這個年紀，已經不太可能再存回去，只能想辦法花得慢一點。' }
      ],
      options: [
        { id: 'careful', label: '很小心地維持著現有的狀態，盡量不讓它變得更差', effects: { health: 1, self: -1 }, next: 'n7_look_back' },
        { id: 'indulge', label: '決定不要那麼小心，想吃想做的都做，反正日子有限', effects: { self: 1, health: -1 }, next: 'n7_look_back' },
        { id: 'decline', label: '這幾年，身體明顯走下坡，很多事已經做不到了', effects: { health: -2, bond: 1 }, next: 'n7_look_back' },
        { id: 'paying_off', requires: { attr: { key: 'health', op: '>=', value: 6 } }, label: '這些年走路、游泳、按時回診，到這個年紀開始領回來', effects: { health: 1, self: 1, bond: 1 }, next: 'n7_look_back' }
      ]
    },

    n7_look_back: {
      id: 'n7_look_back', chapter: 7, title: '回望', ageRange: '50歲以後',
      text: [
        { when: { generation: 2005 }, text: '存摺這種東西你這輩子沒真的用過幾次，但這個比喻你懂。翻回第一頁，重新看了一次。' },
        { text: '存摺走到最後一頁，你把它整本翻回第一頁，重新看了一次。' }
      ],
      options: [
        { id: 'accept', label: '大致接受了這一路走來的樣子', effects: { self: 2, bond: 1 }, next: 'GAME_END' },
        { id: 'regret', label: '有些地方你還是會想，如果當初不一樣就好了', effects: { self: -1, bond: 1 }, next: 'GAME_END' },
        { id: 'proud', label: '為自己撐過來的這些年，感到一種安靜的驕傲', effects: { self: 2, bond: -1 }, next: 'GAME_END' },
        // 回望的最後一個選項照出身給，讓這一局真的收在「你是誰」上
        { id: 'look_back_bookish', requires: { flagsAll: ['書香'] }, label: '第一頁是一張成績單。你想起那時候以為那就是全部', effects: { self: 1, bond: 1 }, next: 'GAME_END' },
        { id: 'look_back_labor', requires: { flagsAll: ['勞動'] }, label: '第一頁是家裡那間店。你想起自己很小就知道錢是怎麼來的', effects: { self: 1, money: 1 }, next: 'GAME_END' },
        { id: 'look_back_single', requires: { flagsAll: ['單親'] }, label: '第一頁只有一個人的字跡。你想起她從來沒說過辛苦', effects: { self: 1, bond: 2 }, next: 'GAME_END' },
        { id: 'look_back_buried', requires: { flagsAll: ['送走父母'] }, label: '你翻到中間那幾頁停了很久，那是送走他們的那幾年', effects: { self: 1, bond: 1 }, next: 'GAME_END' }
      ]
    }

  });
})(window);
