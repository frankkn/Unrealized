(function (global) {
  'use strict';
  var UNREALIZED = global.UNREALIZED = global.UNREALIZED || {};
  UNREALIZED.nodes = UNREALIZED.nodes || {};

  // 第4章共用工作節點結束後：女性先進面試提問節點，男性直接進世代專屬重點戲
  var JOB_NEXT_GATE = [
    { when: { gender: 'F' }, next: 'n4f_interview' },
    { when: { generation: 1975 }, next: 'n4_westward' },
    { when: { generation: 1990 }, next: 'n4_22k' },
    { next: 'n4_replaced' }
  ];
  var GEN_GATE_CH4 = [
    { when: { generation: 1975 }, next: 'n4_westward' },
    { when: { generation: 1990 }, next: 'n4_22k' },
    { next: 'n4_replaced' }
  ];

  // 第5章：只有騎過「疲勞駕駛」伏筆，或健康已經很差，才會遇到車禍節點
  function accidentForeshadowed(state, h) {
    return h.hasFlag(state, '疲勞駕駛') || state.attrs.health <= 3;
  }
  var OVERWORK_NEXT = [
    { when: accidentForeshadowed, next: 'n5_accident' },
    { next: 'n5_debt' }
  ];

  Object.assign(UNREALIZED.nodes, {

    // ---------------- 第 4 章：二十二到二十八 · 第一份工作 ----------------
    n4_job: {
      id: 'n4_job', chapter: 4, title: '第一份工作', ageRange: '22–28歲',
      text: '離開學校之後，第一個真正要面對的問題是：接下來要往哪裡走。',
      options: [
        { id: 'big_corp', label: '進了一間大公司或外商，制度好，但也很卷', effects: { achieve: 2, bond: -1, health: -1 }, next: JOB_NEXT_GATE },
        { id: 'public_job', label: '考上了公職，穩定，但升遷排隊排很長', effects: { money: 1, achieve: -1, self: -1 }, flags: ['公職'], next: JOB_NEXT_GATE },
        { id: 'sme', label: '進了一間中小企業，什麼都要學，也什麼都要做', effects: { achieve: 1, health: -1 }, next: JOB_NEXT_GATE },
        { id: 'beipiao', label: '離開家鄉，一個人到外地或大城市工作', effects: { money: 1, bond: -2 }, flags: ['北漂'], next: JOB_NEXT_GATE },
        { id: 'study_abroad', label: '出國唸書或工作，把自己丟進一個全新的環境', effects: { achieve: 2, money: -2, bond: -1 }, flags: ['出國'], next: JOB_NEXT_GATE },
        { id: 'freelance', label: '接案或創作，收入不穩，但時間是自己的', effects: { self: 2, money: -2 }, flags: ['接案'], next: JOB_NEXT_GATE },
        { id: 'family_biz', label: '回去接家裡的生意，一切都已經是現成的', effects: { money: 1, self: -1, bond: -1 }, next: JOB_NEXT_GATE }
      ]
    },

    n4f_interview: {
      id: 'n4f_interview', chapter: 4, title: '面試裡的那個問題', ageRange: '22–28歲',
      text: '面試官問了一句跟工作內容沒什麼關係的問題：「妳有沒有結婚生子的計畫？」',
      options: [
        { id: 'honest', label: '老實說還沒想那麼遠', effects: { self: 1, achieve: -1 }, next: GEN_GATE_CH4 },
        { id: 'strategic_lie', label: '說已經決定不生了，把話說死', effects: { achieve: 1, self: -1 }, next: GEN_GATE_CH4 },
        { id: 'deflect', label: '反問對方，這跟工作能力有什麼關係', effects: { self: 1, achieve: -1, bond: -1 }, next: GEN_GATE_CH4 }
      ]
    },

    n4_westward: {
      id: 'n4_westward', chapter: 4, title: '西進', ageRange: '22–28歲',
      text: '公司要派你去東莞，一去可能就是三年。',
      options: [
        { id: 'go', label: '你決定去，三年後回來，故鄉有些東西已經不認得你', effects: { money: 2, bond: -2 }, flags: ['西進'], next: 'n4_mlm' },
        { id: 'stay', label: '你選擇留下，升遷的機會給了那個去的人', effects: { bond: 1, achieve: -2 }, next: 'n4_mlm' },
        { id: 'go_family', label: '你帶著家人一起去，孩子在那邊長大，講話都有腔調了', effects: { money: 1, bond: -1, self: -1 }, flags: ['西進'], next: 'n4_mlm' }
      ]
    },

    n4_22k: {
      id: 'n4_22k', chapter: 4, title: '{起薪}', ageRange: '22–28歲',
      text: '起薪{起薪}，你算了一下，連房租都吃緊。',
      options: [
        { id: 'endure', label: '先忍著，騎驢找馬', effects: { money: -1, self: -1 }, next: 'n4_mlm' },
        { id: 'leave', label: '辭職換了一間薪水好一點的公司，隔年剛好遇到無薪假', effects: { money: 1, achieve: -1, health: -1 }, next: 'n4_mlm' },
        { id: 'side_job', label: '一邊上班一邊兼第二份差，拿睡眠換錢', effects: { money: 1, health: -2 }, next: 'n4_mlm' }
      ]
    },

    n4_replaced: {
      id: 'n4_replaced', chapter: 4, title: '被取代', ageRange: '22–28歲',
      text: '你剛學會、還不算熟練的入門工作，被一個模型接手了。',
      options: [
        { id: 'pivot', label: '轉去一個模型還碰不到的領域，從頭學', effects: { achieve: -1, money: -1, self: 1 }, flags: ['被取代'], next: 'n4_mlm' },
        { id: 'push_up', label: '拼命把自己往上擠，做那些模型還做不到的事', effects: { achieve: 1, health: -1 }, flags: ['被取代'], next: 'n4_mlm' },
        { id: 'freeze', label: '花了很長一段時間，才決定下一步是什麼', effects: { self: -1, money: -1 }, flags: ['被取代'], next: 'n4_mlm' }
      ]
    },

    n4_mlm: {
      id: 'n4_mlm', chapter: 4, title: '改變人生的機會', ageRange: '22–28歲',
      text: '一個家人或大學同學興沖沖跟你介紹一個「能改變人生的機會」——可能是直銷，也可能是一個很懂你的團體。',
      options: [
        { id: 'join', label: '投入了，前期還真的賺到一點錢', effects: { money: 1, bond: -1 }, flags: ['宗教金錢'], next: 'n5_career_move' },
        { id: 'refuse_breakup', label: '直接拒絕，對方覺得你不夠支持，關係漸漸疏遠', effects: { bond: -2, self: 1 }, next: 'n5_career_move' },
        { id: 'half_in_borrow', label: '半推半就跟著投入，還跟人借了一點錢加碼', effects: { money: -1, bond: -1 }, flags: ['宗教金錢', '借貸'], next: 'n5_career_move' }
      ]
    },

    // ---------------- 第 5 章：二十八到三十五 · 清算開始 ----------------
    n5_career_move: {
      id: 'n5_career_move', chapter: 5, title: '職涯的一次大波動', ageRange: '28–35歲',
      text: '三十歲前後，好幾個機會或警訊，同時擠進了你的職場生活。',
      options: [
        { id: 'big_jump', label: '跳槽到一個更有挑戰的位置，薪資漲了不少', effects: { achieve: 2, health: -1, bond: -1 }, next: 'n5_marriage' },
        { id: 'steady', label: '留在原本的位置，穩，但薪資幾年沒什麼變化', effects: { bond: 1, achieve: -1 }, next: 'n5_marriage' },
        { id: 'setback', label: '一次組織調整，你被降了職', effects: { achieve: -2, self: -1 }, next: 'n5_marriage' }
      ]
    },

    n5_marriage: {
      id: 'n5_marriage', chapter: 5, title: '要不要進入婚姻', ageRange: '28–35歲',
      text: [
        { when: { flagsAll: ['同性伴侶'], generation: 1975 }, text: '你們在一起很久了，但在你這一代，連登記這件事都不存在選項裡。' },
        { when: { flagsAll: ['同性伴侶'] }, text: '你們討論著要不要去登記，把這段關係正式化。' },
        { text: '你要不要正式進入一段婚姻，變成一個躲不掉的問題。' }
      ],
      options: [
        { id: 'marry_common', requires: { flagsNone: ['同性伴侶'] }, label: '決定結婚，辦了一場{婚禮排場}', effects: { bond: 2, money: -1 }, flags: ['成家'], next: 'n5_children' },
        { id: 'stay_unmarried', requires: { flagsNone: ['同性伴侶'] }, label: '決定不婚，繼續在一起，但不進入法律關係', effects: { self: 1, achieve: -1 }, flags: ['未婚'], next: 'n5_children' },
        { id: 'breakup_common', requires: { flagsNone: ['同性伴侶'] }, label: '這段關係，最後還是走到了分開', effects: { bond: -2, self: 1 }, next: 'n5_children' },

        { id: 'register_lgbt', requires: { flagsAll: ['同性伴侶'], generation: [1990, 2005] }, label: '一起去登記，正式成為法律上的家人', effects: { bond: 2, money: -1 }, flags: ['成家'], next: 'n5_children' },
        { id: 'no_register_lgbt', requires: { flagsAll: ['同性伴侶'], generation: [1990, 2005] }, label: '決定不登記，反正感情才是真的', effects: { self: 1, bond: -1 }, next: 'n5_children' },
        { id: 'closeted_partner_1975', requires: { flagsAll: ['同性伴侶'], generation: 1975 }, label: '用室友的名義生活在一起，對外什麼都不能說', effects: { bond: 1, self: -2 }, flags: ['未出櫃'], next: 'n5_children' },
        { id: 'breakup_lgbt_1975', requires: { flagsAll: ['同性伴侶'], generation: 1975 }, label: '長期活在沒有法律保障的關係裡，某次爭吵後分開了', effects: { bond: -2, self: -1 }, next: 'n5_children' }
      ]
    },

    n5_children: {
      id: 'n5_children', chapter: 5, title: '有沒有孩子', ageRange: '28–35歲',
      text: '有沒有孩子，或什麼時候要決定，開始變成一個躲不掉的問題。',
      options: [
        { id: 'have_kids', label: '決定生小孩', effects: { bond: 1, money: -2, health: -1 }, flags: ['有小孩'], next: 'n5_house' },
        { id: 'dink', label: '決定不生，把資源留給彼此', effects: { money: 1, self: 1, bond: -1 }, flags: ['丁客'], next: 'n5_house' },
        { id: 'undecided_f', requires: { gender: 'F' }, label: '一直沒有決定，親戚每次見面都要問一次，你開始不太想出席家庭聚會', effects: { self: -1, bond: -1, health: -1 }, next: 'n5_house' },
        { id: 'undecided_m', requires: { gender: 'M' }, label: '一直沒有決定，反正好像也沒那麼急', effects: { self: -1, bond: -1 }, next: 'n5_house' }
      ]
    },

    n5_house: {
      id: 'n5_house', chapter: 5, title: '房子', ageRange: '28–35歲',
      text: '買房這件事，對你來說，{買房難度}。',
      options: [
        { id: 'buy_leverage', label: '砸下所有存款，外加一筆大額房貸，買了', effects: { money: -2, self: 1 }, flags: ['高槓桿'], next: 'n5_invest' },
        { id: 'rent_forever', label: '放棄買房這件事，把錢花在別的地方', effects: { self: 1, money: 1, bond: -1 }, next: 'n5_invest' },
        { id: 'stay_family', label: '繼續跟家人住，省下這筆錢', effects: { money: 1, bond: -1, self: -1 }, next: 'n5_invest' }
      ]
    },

    n5_invest: {
      id: 'n5_invest', chapter: 5, title: '那筆存款', ageRange: '28–35歲',
      text: '你開始認真想，要怎麼處理手上這筆不上不下的存款。',
      options: [
        { id: 'etf', label: '選了{存款工具}那種穩穩來的方式', effects: { money: 1, self: -1 }, next: 'n5_parents_ill' },
        { id: 'leverage_trade', label: '開始融資當沖，想加速累積的速度', effects: { money: 2, health: -1 }, flags: ['投機'], next: 'n5_parents_ill' },
        { id: 'avoid', label: '決定完全不碰，只求別虧', effects: { self: 1, money: -1 }, next: 'n5_parents_ill' }
      ]
    },

    n5_parents_ill: {
      id: 'n5_parents_ill', chapter: 5, title: '長輩病了', ageRange: '28–35歲',
      text: '家裡長輩的健康出了狀況，誰來處理，變成一個很現實的問題。',
      options: [
        { id: 'care_f', requires: { gender: 'F' }, label: '大家看向你，好像照顧本來就該是你的事', effects: { bond: 1, self: -2, health: -1 }, flags: ['照顧'], next: 'n5_body_signal' },
        { id: 'money_m', requires: { gender: 'M' }, label: '你被期待的角色是出錢，不是出時間', effects: { money: -2, bond: 1 }, next: 'n5_body_signal' },
        { id: 'hire_caregiver', label: '花錢請了看護，減輕一些負擔', effects: { money: -2, self: 1 }, next: 'n5_body_signal' }
      ]
    },

    n5_body_signal: {
      id: 'n5_body_signal', chapter: 5, title: '身體的訊號', ageRange: '28–35歲',
      text: '你已經好幾年沒有好好做過健檢了。',
      options: [
        { id: 'ignore', label: '告訴自己，再忙一段時間就好', effects: { health: -2, achieve: 1 }, next: 'n5_overwork' },
        { id: 'check', label: '抽空去檢查了一次，報告上有幾個字讓你多想了一下', effects: { health: 1, self: -1 }, next: 'n5_overwork' },
        { id: 'delegate_worry', label: '把這件事丟給旁邊的人念，自己還是沒去', effects: { health: -1, bond: -1 }, next: 'n5_overwork' }
      ]
    },

    n5_overwork: {
      id: 'n5_overwork', chapter: 5, title: '超支的日子', ageRange: '28–35歲',
      text: '為了那個位置，你開始了一段長時間透支的日子。',
      options: [
        { id: 'push_through', label: '連續好幾個月加班到最後一班車，有一次騎車回家時差點打瞌睡', effects: { achieve: 1, health: -2 }, flags: ['疲勞駕駛'], next: OVERWORK_NEXT },
        { id: 'pace_self', label: '試著把節奏放慢一點，升遷排在後面一點', effects: { self: 1, achieve: -1 }, next: OVERWORK_NEXT },
        { id: 'burn_bridge', label: '直接跟主管說做不到，關係從此有點尷尬', effects: { bond: -1, self: 1, achieve: -1 }, next: OVERWORK_NEXT }
      ]
    },

    n5_accident: {
      id: 'n5_accident', chapter: 5, title: '那場車禍', ageRange: '28–35歲',
      text: '那天你趕時間，或者只是太累，一個閃神，車禍發生了。',
      options: [
        { id: 'own_injury', label: '傷的是自己，復原花了比你想的更久的時間', effects: { health: -2, money: -1 }, next: 'n5_debt' },
        { id: 'hit_someone', label: '撞到了人，責任在你，賠償跟自責一起壓上來', effects: { money: -2, bond: -1, self: -1 }, flags: ['車禍責任'], next: 'n5_debt' },
        { id: 'long_lawsuit', label: '對方全責，但你被卷進一場拖了三年的官司', effects: { self: -2, achieve: -1 }, flags: ['車禍訴訟'], next: 'n5_debt' }
      ]
    },

    n5_debt: {
      id: 'n5_debt', chapter: 5, title: '算不過來的那筆錢', ageRange: '28–35歲',
      text: '有一筆錢，你怎麼算都算不過來。',
      options: [
        { id: 'credit_cash_card', label: '辦了現金卡，先撐過去', effects: { money: 1, self: -1 }, flags: ['借貸'], next: 'n5_era_storm' },
        { id: 'borrow_family', label: '跟家人借了一筆，說好會還', effects: { bond: -1, money: 1 }, flags: ['借貸'], next: 'n5_era_storm' },
        { id: 'grind_through', label: '不借，靠自己硬撐過去，日子變得很緊', effects: { health: -1, self: 1 }, next: 'n5_era_storm' }
      ]
    },

    n5_era_storm: {
      id: 'n5_era_storm', chapter: 5, title: '那一場風暴', ageRange: '28–35歲',
      text: [
        { when: { generation: 1975 }, text: '1997年，亞洲金融風暴，你的產業正好在浪頭上。' },
        { when: { generation: 1990 }, text: '一場突然來的疫情，把你原本的計畫全部打亂。' },
        { text: '2035年那場推想中的變動，正好在你最沒有準備的時候發生。' }
      ],
      options: [
        { id: 'hit_hard', label: '這場風暴直接打在你身上，損失很實際', effects: { money: -2, self: -1 }, flags: ['遇到風暴'], next: 'n5_emigrate' },
        { id: 'dodge', label: '算你運氣好，躲過了最壞的那一波，但身邊有人沒躲過', effects: { bond: -1, self: 1 }, next: 'n5_emigrate' },
        { id: 'miss_opportunity', label: '風暴過後的復甦期，你因為太保守，沒跟上那波機會', effects: { achieve: -1, money: -1 }, flags: ['錯過紅利'], next: 'n5_emigrate' }
      ]
    },

    n5_emigrate: {
      id: 'n5_emigrate', chapter: 5, title: '要不要移民', ageRange: '28–35歲',
      text: '為了孩子的教育、政治氛圍，或單純想換一個地方生活，你們認真討論起移民這件事。',
      options: [
        { id: 'emigrate_go', label: '最後決定舉家搬走', effects: { bond: -1, money: -2 }, flags: ['移民'], next: 'GAME_END' },
        { id: 'emigrate_stay', label: '討論了很久，最後決定留下來', effects: { self: -1, bond: 1 }, next: 'GAME_END' },
        { id: 'emigrate_half', label: '你一個人先過去卡位，家人晚一點再說', effects: { bond: -2, money: 1 }, flags: ['移民'], next: 'GAME_END' }
      ]
    }

  });
})(window);
