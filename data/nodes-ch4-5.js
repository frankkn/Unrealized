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
  // 「有一筆錢，你怎麼算都算不過來」——這不是每個人都成立。
  // 這個節點無條件跑，而且三個選項有兩個會蓋上「借貸」，
  // 等於走過第5章就被貼上財務陰影，第6章必定被抓去清算。
  // 真的有缺口的人才會遇到：手頭已經緊，或身上有大筆固定支出。
  //
  // 第二版：三個旗標原本單獨就能放行，於是事業穩定、薪水很夠的人只因為
  // 生了小孩，也會被告知「有一筆錢，你怎麼算都算不過來」，還拿到
  // 「辦了現金卡，先撐過去」——29% 的觸發發生在 money>=6 的局。
  // 小孩、長照、房貸是**固定支出**，不是缺口；缺口是「支出撞上薄的餘裕」。
  // 所以改成看餘裕：底下一定緊，上面一定撐得住，中間那一段才由負擔決定。
  function hasCashShortfall(state) {
    if (state.attrs.money <= 4) return true;
    if (state.attrs.money >= 8) return false;
    return !!(state.flags['高槓桿'] || state.flags['有小孩'] || state.flags['照顧']);
  }

  // 「一個家人或大學同學興沖沖跟你介紹一個能改變人生的機會」——
  // 這是被找上門，不是每個人都會被找上。真的聽下去的是手頭很緊的人，
  // 或身邊真有那麼近的人開得了這個口。原本 100% 觸發，「宗教金錢」旗標也就近乎人人有。
  function pitchLandsOnYou(state) {
    return state.attrs.money <= 4 || state.attrs.bond >= 7;
  }
  var MLM_OR_SKIP = [
    { when: pitchLandsOnYou, next: 'n4_mlm' },
    { next: 'n5_career_move' }
  ];

  // 移民要同時有推力跟能力：有小孩（教育）、已經在外面待過、或錢真的夠。
  // 沒有任何一項的人不會在三十歲「認真討論起移民」。
  function emigrationIsOnTheTable(state) {
    // 已經在外面待過的人，這件事本來就在他的選項清單裡
    if (state.flags['出國'] || state.flags['西進']) return true;
    // 為了孩子的教育是最常見的理由，但還是得付得起
    if (state.flags['有小孩'] && state.attrs.money >= 5) return true;
    return state.attrs.money >= 7;
  }
  var EMIGRATE_OR_SKIP = [
    { when: emigrationIsOnTheTable, next: 'n5_emigrate' },
    { next: 'n6_career_plateau' }
  ];
  // 移民節點是第5章的出口，走完就進第6章

  // 遊戲原本只有壞運氣（車禍、風暴、詐騙），一個好運都沒有——那不是人生，是刑期。
  // 但好運不該是天上掉下來的：它落在「手上剛好有東西可以被幸運到」的人身上。
  // 這跟 SPEC §3.3.1 是同一條原則：有回報的東西要先投入過才看得到。
  // 第一版把五個旗標 OR 起來，86% 的局都會遇到——那不叫好運，叫日常。
  // 改成每個世代對應它自己那一版敘述的前提：阿公的地要家裡真的有做那行，
  // 忘了管的股票要真的買過，被演算法推出去的東西要真的做過。
  function luckHasSomethingToLandOn(state) {
    if (state.attrs.money >= 9) return true;          // 錢多到什麼都可能碰上
    if (state.generation === 1975) return !!state.flags['勞動'];
    if (state.generation === 1990) return !!(state.flags['投機'] || state.flags['早知道存']);
    return !!(state.flags['接案'] || state.flags['喜歡的科系']);
  }
  // 「你開始認真想，要怎麼處理手上這筆不上不下的存款」——手上要真的有那筆錢
  function hasSavingsToWorryAbout(state) { return state.attrs.money >= 4; }
  // 「為了那個位置，你開始了一段長時間透支的日子」——要先有那個位置在追
  function chasingAPosition(state) { return state.attrs.achieve >= 5; }

  // 第 5 章：13 個節點原本一局要走 10.6 個——七年的人生給你十個畫面，
  // 而且同世代連玩兩局有 90% 的節點重複，可是這個遊戲是設計來玩六輪的。
  // 改成從池子裡抽：前提檢查照舊（不成立的根本抽不到），成立的也只挑四個演。
  // 骨幹留在池子外——職涯波動、婚姻、小孩決定了下游所有結構性旗標，不能抽掉。
  var CH5_POOL = {
    id: 'ch5', pick: 3, then: EMIGRATE_OR_SKIP,
    of: [
      { next: 'n5_house' },
      { when: hasSavingsToWorryAbout, next: 'n5_invest' },
      { when: luckHasSomethingToLandOn, next: 'n5_windfall' },
      { next: 'n5_parents_ill' },
      { next: 'n5_body_signal' },
      { when: chasingAPosition, next: 'n5_overwork' },
      { when: hasCashShortfall, next: 'n5_debt' },
      { next: 'n5_era_storm' }
    ]
  };

  // 超支 → 車禍是刻意的伏筆，抽到超支就把車禍當成它的後半段，不另外進池子
  var OVERWORK_NEXT = [
    { when: accidentForeshadowed, next: 'n5_accident' },
    { next: CH5_POOL }
  ];

  Object.assign(UNREALIZED.nodes, {

    // ---------------- 第 4 章：二十二到二十八 · 第一份工作 ----------------
    // 「做什麼」與「去哪裡」是兩個獨立的問題，硬塞成一題會變成七個選項的清單，
    // 而且會漏掉「北漂進大公司」這種最常見的組合。拆成兩步之後每步都只有 3–5 個。
    n4_job: {
      id: 'n4_job', chapter: 4, title: '第一份工作', ageRange: '22–28歲',
      text: '離開學校之後，第一個真正要面對的問題是：靠什麼過日子。你找工作靠的是{求職方式}，帶你的人要你叫他{職場稱呼}。',
      options: [
        { id: 'big_corp', label: '進了一間大公司或外商，制度好，但也很卷', effects: { achieve: 2, money: 1, bond: -1 }, next: 'n4_where' },
        { id: 'public_job', label: '考上了公職，穩定，但升遷排隊排很長', effects: { money: 1, health: 1, achieve: -1, self: -1 }, flags: ['公職'], next: 'n4_where' },
        { id: 'sme', label: '進了一間中小企業，什麼都要學，也什麼都要做', effects: { achieve: 1, bond: -1 }, next: 'n4_where' },
        { id: 'freelance', label: '接案或創作，收入不穩，但時間是自己的', effects: { self: 2, health: 1, money: -2, achieve: -1 }, flags: ['接案'], next: 'n4_where' },
        // 接家業已經回答了「在哪裡」，直接跳過地點那一題
        { id: 'family_biz', label: '回去接家裡的生意，一切都已經是現成的', effects: { money: 1, bond: 1, self: -2 }, next: JOB_NEXT_GATE },
        { id: 'funded_start', requires: { flagsAny: ['富裕'] }, label: '自己開一間。第一年的燒錢期，家裡替你擋掉了', effects: { achieve: 2, money: 1, self: 1, bond: -1 }, flags: ['創業', '有靠山'], next: 'n4_where' }
      ]
    },

    n4_where: {
      id: 'n4_where', chapter: 4, title: '在哪裡落腳', ageRange: '22–28歲',
      text: '工作決定了，接下來是另一個問題：這幾年，你要住在哪裡。',
      options: [
        { id: 'stay_local', label: '留在家鄉附近，機會少一點，但爸媽就在旁邊', effects: { bond: 1, health: 1 }, next: JOB_NEXT_GATE },
        { id: 'beipiao', label: [
            { when: { generation: 1975 }, text: '往北部走，租一間頂樓加蓋，開始一個人的生活' },
            { text: '北漂到台北或新竹，租金吃掉三分之一的薪水' }
          ], effects: { money: 1, bond: -2 }, flags: ['北漂'], next: JOB_NEXT_GATE },
        { id: 'abroad', label: '出去，把自己丟進一個全新的環境', effects: { achieve: 2, money: -2, bond: -1 }, flags: ['出國'], next: JOB_NEXT_GATE }
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
        { id: 'go', label: '你決定去，三年後回來，故鄉有些東西已經不認得你', effects: { money: 2, bond: -2 }, flags: ['西進'], next: MLM_OR_SKIP },
        { id: 'stay', label: '你選擇留下，升遷的機會給了那個去的人。那幾年你養成了每天走路回家的習慣', effects: { bond: 1, health: 1, achieve: -2 }, next: MLM_OR_SKIP },
        { id: 'go_family', label: '你帶著家人一起去，孩子在那邊長大，講話都有腔調了', effects: { money: 1, bond: -1, self: -1 }, flags: ['西進'], next: MLM_OR_SKIP }
      ]
    },

    n4_22k: {
      id: 'n4_22k', chapter: 4, title: '{起薪}', ageRange: '22–28歲',
      text: '起薪{起薪}，你算了一下，連房租都吃緊。同期進來的人已經有兩個走了，走的方式是{離職方式}。',
      options: [
        { id: 'endure', label: '先忍著，騎驢找馬', effects: { achieve: 1, money: -1, self: -1 }, next: MLM_OR_SKIP },
        { id: 'leave', label: '辭職換了一間薪水好一點的公司，隔年剛好遇到無薪假', effects: { money: 1, achieve: -1, self: -1 }, next: MLM_OR_SKIP },
        { id: 'side_job', label: '一邊上班一邊兼第二份差，拿睡眠換錢', effects: { money: 1, health: -2 }, next: MLM_OR_SKIP },
        { id: 'cheap_and_fit', label: '錢不夠就不出門，改成自己煮、騎車上下班，反而是這幾年最健康的時候', effects: { health: 2, money: 1, bond: -1, achieve: -1 }, flags: ['有在動'], next: MLM_OR_SKIP },
        { id: 'no_rush', requires: { flagsAny: ['富裕'] }, label: '家裡說不急。你就真的不急，慢慢挑了一年', effects: { health: 2, self: 1, achieve: -1, bond: -1 }, next: MLM_OR_SKIP }
      ]
    },

    n4_replaced: {
      id: 'n4_replaced', chapter: 4, title: '被取代', ageRange: '22–28歲',
      text: '你剛學會、還不算熟練的入門工作，被一個模型接手了。',
      options: [
        { id: 'pivot', label: '轉去一個模型還碰不到的領域，從頭學', effects: { achieve: -1, money: -1, self: 1 }, flags: ['被取代'], next: MLM_OR_SKIP },
        { id: 'push_up', label: '拼命把自己往上擠，做那些模型還做不到的事', effects: { achieve: 1, self: -1 }, flags: ['被取代'], next: MLM_OR_SKIP },
        { id: 'freeze', label: '花了很長一段時間，才決定下一步是什麼', effects: { self: -1, money: -1 }, flags: ['被取代'], next: MLM_OR_SKIP },
        { id: 'off_screen', label: '既然機器搶走的是螢幕前的工作，你去做需要用到身體的那一種', effects: { health: 2, self: 1, achieve: -1 }, flags: ['被取代', '有在動'], next: MLM_OR_SKIP }
      ]
    },

    n4_mlm: {
      id: 'n4_mlm', chapter: 4, title: '改變人生的機會', ageRange: '22–28歲',
      text: '一個家人或大學同學興沖沖跟你介紹一個「能改變人生的機會」——可能是直銷，也可能是一個很懂你的團體。你回去查了一下，說法兩極——你的消息來源是{資訊來源}。',
      options: [
        { id: 'join', label: '投入了，前期還真的賺到一點錢', effects: { money: 1, bond: -1 }, flags: ['宗教金錢'], next: 'n5_career_move' },
        { id: 'refuse_breakup', label: '直接拒絕，對方覺得你不夠支持，關係漸漸疏遠', effects: { bond: -2, self: 1 }, next: 'n5_career_move' },
        { id: 'half_in_borrow', label: '半推半就跟著投入，還跟人借了一點錢加碼', effects: { money: -1, bond: -1 }, flags: ['宗教金錢', '借貸'], next: 'n5_career_move' }
      ]
    },

    // ---------------- 第 5 章：二十八到三十五 · 清算開始 ----------------
    n5_career_move: {
      id: 'n5_career_move', chapter: 5, title: '職涯的一次大波動', ageRange: '28–35歲',
      // 回聲：第0–3章蓋的旗標（書香／勞動／單親／技職／頂大／喜歡的科系…）
      // 原本蓋完就沒有人再讀，等於遊戲記得你是誰，卻從來沒提過。
      // 變體照「窄的排前面」的規則排。
      text: [
        { when: { flagsAll: ['喜歡的科系'] }, text: '三十歲前後，好幾個機會擠了進來。你發現當年那個沒人看好的科系，繞了一圈還是有人在找。' },
        { when: { flagsAll: ['技職'] }, text: '三十歲前後，好幾個機會或警訊同時擠了進來。你手上那門技術，這幾年變得比很多學歷值錢。' },
        { when: { flagsAll: ['中離'] }, text: '三十歲前後，機會來過幾次。每一次你都要先解釋一遍自己為什麼沒有那張紙。' },
        { when: { flagsAll: ['頂大'] }, text: '三十歲前後，好幾個機會或警訊同時擠了進來。當年那張學歷幫你開了幾扇門，之後就沒什麼用了。' },
        { when: { flagsAll: ['明星高中'] }, text: '三十歲前後，好幾個機會或警訊同時擠了進來。高中同學那個群組還在，只是現在大家報的都是職稱。' },
        { text: '三十歲前後，好幾個機會或警訊，同時擠進了你的職場生活。' }
      ],
      options: [
        { id: 'big_jump', label: '跳槽到一個更有挑戰的位置，薪資漲了不少', effects: { achieve: 2, money: 1, bond: -1 }, next: 'n5_marriage' },
        { id: 'steady', label: '留在原本的位置，穩，年資一年一年疊上去', effects: { bond: 1, health: 1, achieve: 1 }, next: 'n5_marriage' },
        { id: 'setback', label: '一次組織調整，你被降了職', effects: { achieve: -2, self: -1 }, next: 'n5_marriage' },
        { id: 'it_worked', requires: { attr: { key: 'achieve', op: '>=', value: 5 } }, label: '你手上那個做了很久的東西，這一年終於做起來了', effects: { achieve: 2, money: 1 }, next: 'n5_marriage' },
        { id: 'slept_on_it', label: '你開始固定運動、按時睡覺。睡飽之後才發現，白天的效率是另一回事', effects: { health: 2, achieve: 1, bond: -1, money: -1 }, flags: ['有在動'], next: 'n5_marriage' }
      ]
    },

    n5_marriage: {
      id: 'n5_marriage', chapter: 5, title: '要不要進入婚姻', ageRange: '28–35歲',
      text: [
        { when: { flagsAll: ['同性伴侶'], generation: 1975 }, text: '你們在一起很久了，但在你這一代，連登記這件事都不存在選項裡。' },
        { when: { flagsAll: ['同性伴侶'] }, text: '你們討論著要不要去登記，把這段關係正式化。' },
        // 單身的人問的不是「要不要結」，是「要不要開始」
        { when: { flagsAll: ['單身'] }, text: '身邊的人一個一個結婚，喜帖收到有點麻了。你自己這邊，一直沒有那個對象。' },
        { text: '你要不要正式進入一段婚姻，變成一個躲不掉的問題。' }
      ],
      options: [
        { id: 'marry_common', requires: { flagsNone: ['同性伴侶', '單身'] }, label: '決定結婚，辦了一場{婚禮排場}', effects: { bond: 2, money: -1 }, flags: ['成家'], next: 'n5_children' },
        { id: 'stay_unmarried', requires: { flagsNone: ['同性伴侶', '單身'] }, label: '決定不婚，繼續在一起，但不進入法律關係', effects: { self: 1, bond: -1 }, flags: ['未婚'], next: 'n5_children' },
        { id: 'breakup_common', requires: { flagsNone: ['同性伴侶', '單身'] }, label: '這段關係，最後還是走到了分開', effects: { bond: -2, self: 1 }, flags: ['單身'], next: 'n5_children' },

        // 單身專屬：遇到人就把「單身」這個狀態拿掉，不然下游會一直以為你還是一個人
        { id: 'met_someone', requires: { flagsAll: ['單身'] }, label: '三十幾歲那年真的遇到一個人，這次你沒有再往後退', effects: { bond: 2, self: 1, money: -1 }, flags: ['成家'], unflags: ['單身'], next: 'n5_children' },
        { id: 'arranged', requires: { flagsAll: ['單身'] }, label: '你的姻緣是{相親方式}來的，見了幾次，就這樣定下來了', effects: { bond: 1, money: -1, self: -1 }, flags: ['成家'], unflags: ['單身'], next: 'n5_children' },
        { id: 'stay_single', requires: { flagsAll: ['單身'] }, label: '一個人也過得好，你沒有打算為了誰改變這件事', effects: { self: 2, bond: -1 }, next: 'n5_children' },

        { id: 'register_lgbt', requires: { flagsAll: ['同性伴侶'], generation: [1990, 2005] }, label: '一起去登記，正式成為法律上的家人', effects: { bond: 2, money: -1 }, flags: ['成家'], next: 'n5_children' },
        { id: 'no_register_lgbt', requires: { flagsAll: ['同性伴侶'], generation: [1990, 2005] }, label: '決定不登記，反正感情才是真的', effects: { self: 1, bond: -1 }, next: 'n5_children' },
        { id: 'closeted_partner_1975', requires: { flagsAll: ['同性伴侶'], generation: 1975 }, label: '用室友的名義生活在一起，對外什麼都不能說', effects: { bond: 1, self: -2 }, flags: ['未出櫃'], next: 'n5_children' },
        { id: 'breakup_lgbt_1975', requires: { flagsAll: ['同性伴侶'], generation: 1975 }, label: '長期活在沒有法律保障的關係裡，某次爭吵後分開了', effects: { bond: -2, self: -1 }, flags: ['單身'], next: 'n5_children' }
      ]
    },

    n5_children: {
      id: 'n5_children', chapter: 5, title: '有沒有孩子', ageRange: '28–35歲',
      text: [
        // 一個人的話，親戚問的問題不一樣，選項也不該寫「留給彼此」
        { when: { flagsAll: ['單身'] }, text: '身邊的人開始有小孩，家庭聚會的話題跟著變了。親戚問你的問題，從「什麼時候結婚」變成「一個人不寂寞嗎」。' },
        { text: '有沒有孩子，或什麼時候要決定，開始變成一個躲不掉的問題。在你這一代，帶小孩這件事是{育兒資源}。' }
      ],
      options: [
        { id: 'have_kids', requires: { flagsNone: ['單身'], generation: [1990, 2005] }, label: '決定生小孩', effects: { bond: 1, money: -2, self: -1 }, flags: ['有小孩'], next: CH5_POOL },
        // 1975 的異性戀伴侶走原本那條；同性伴侶在那個年代要有小孩，
        // 現實上只有一條路，而那條路的代價是把自己收起來
        { id: 'have_kids_1975', requires: { flagsNone: ['單身', '同性伴侶'], generation: 1975 }, label: '決定生小孩', effects: { bond: 1, money: -2, self: -1 }, flags: ['有小孩'], next: CH5_POOL },
        { id: 'married_out_1975', requires: { flagsAll: ['同性伴侶'], generation: 1975 }, label: '家裡壓了很多年，你走進一段對外的婚姻，也有了孩子', effects: { bond: 1, money: -1, self: -2 }, flags: ['有小孩', '未出櫃', '壓抑'], next: CH5_POOL },
        { id: 'dink', requires: { flagsNone: ['單身'] }, label: '決定不生，把資源留給彼此', effects: { money: 1, self: 1, bond: -1 }, flags: ['丁客'], next: CH5_POOL },
        { id: 'nephews', requires: { flagsAll: ['單身'] }, label: '把姪子外甥當自己的孩子疼，紅包給得比誰都大', effects: { bond: 2, money: -1 }, next: CH5_POOL },
        { id: 'considered_alone', requires: { flagsAll: ['單身'] }, label: '認真算過一個人生養小孩的可能，最後決定不要', effects: { self: 1, bond: -1 }, flags: ['無子'], next: CH5_POOL },
        { id: 'undecided_f', requires: { gender: 'F', flagsNone: ['單身'] }, label: '一直沒有決定，親戚每次見面都要問一次，你開始不太想出席家庭聚會', effects: { self: -1, bond: -1, health: -1 }, next: CH5_POOL },
        { id: 'undecided_m', requires: { gender: 'M', flagsNone: ['單身'] }, label: '一直沒有決定，反正好像也沒那麼急', effects: { self: -1, bond: -1 }, next: CH5_POOL }
      ]
    },

    n5_house: {
      id: 'n5_house', chapter: 5, title: '房子', ageRange: '28–35歲',
      text: '買房這件事，對你來說，{買房難度}。',
      options: [
        { id: 'buy_leverage', label: '砸下所有存款，外加一筆大額房貸，買了', effects: { money: -2, self: 1 }, flags: ['高槓桿'], next: CH5_POOL },
        { id: 'rent_forever', label: '放棄買房這件事，把錢花在別的地方', effects: { self: 1, money: 1, achieve: -1 }, next: CH5_POOL },
        { id: 'stay_family', label: '繼續跟家人住，省下這筆錢', effects: { money: 1, bond: -1, self: -1 }, next: CH5_POOL },
        // 頭期款是台灣最真實的一道分水嶺：同樣的努力，有沒有這一筆，結果差二十年
        { id: 'family_paid', requires: { flagsAny: ['富裕'] }, label: '頭期款家裡出。你簽名的時候才知道那個數字', effects: { money: 2, self: -2, bond: 1 }, flags: ['家裡出頭期'], next: CH5_POOL }
      ]
    },

    n5_invest: {
      id: 'n5_invest', chapter: 5, title: '那筆存款', ageRange: '28–35歲',
      text: [
        { when: { flagsAll: ['早知道存'] }, text: '你從十八歲那筆打工錢就開始存了。現在這筆數字，是那個習慣累積出來的。' },
        { when: { flagsAll: ['第一次揮霍'] }, text: '你開始認真想這筆存款怎麼處理。你很清楚自己花錢的樣子——十八歲那筆錢就是一次花完的。' },
        { text: '你開始認真想，要怎麼處理手上這筆不上不下的存款。' }
      ],
      options: [
        { id: 'etf', label: '選了{存款工具}那種穩穩來的方式', effects: { money: 1, self: -1 }, next: CH5_POOL },
        { id: 'leverage_trade', label: '開始融資當沖，想加速累積的速度', effects: { money: 2, health: -1 }, flags: ['投機'], next: CH5_POOL },
        { id: 'avoid', label: '決定完全不碰，只求別虧', effects: { self: 1, health: 1, money: -1 }, next: CH5_POOL }
      ]
    },

    // 好運。落點依世代給不同的畫面，但問的是同一件事：拿到之後你怎麼處理。
    // 選項刻意都不錯——這是這個遊戲少數幾個「你怎麼選都不會虧」的節點。
    n5_windfall: {
      id: 'n5_windfall', chapter: 5, title: '意料之外的一筆', ageRange: '28–35歲',
      text: [
        { when: { generation: 1975 }, text: '阿公留下來的那塊地，重劃之後突然值了錢。你從來沒把它算進自己的人生規劃裡。' },
        { when: { generation: 1990 }, text: '你買來就放著沒管的那支，這一年翻了好幾倍。你很清楚這不是因為你眼光好。' },
        { text: '你隨手做的一個東西，被演算法推了出去。一個月的數字比你一年的薪水還多。' }
      ],
      options: [
        { id: 'took_a_year', label: '你停下來休息了一整年。那一年後來被你記得很久', effects: { health: 2, self: 2, achieve: -1 }, flags: ['好運', '休息過'], next: CH5_POOL },
        { id: 'reinvest', label: '全部投回去，想把運氣變成實力', effects: { achieve: 2, money: 1, self: -1 }, flags: ['好運'], next: CH5_POOL },
        { id: 'gave_family', label: '分給家裡的人。他們到現在都還會提起這件事', effects: { bond: 3, money: -1 }, flags: ['好運'], next: CH5_POOL },
        { id: 'kept_quiet', label: '你沒告訴任何人，就那樣放著', effects: { money: 2, self: 1, bond: -1 }, flags: ['好運'], next: CH5_POOL }
      ]
    },

    n5_parents_ill: {
      id: 'n5_parents_ill', chapter: 5, title: '長輩病了', ageRange: '28–35歲',
      text: [
        { when: { flagsAll: ['獨生'] }, text: '家裡長輩的健康出了狀況。沒有人可以商量，也沒有人可以推——這件事從頭到尾就是你的。' },
        { when: { flagsAll: ['長子女'] }, text: '家裡長輩的健康出了狀況。大家在群組裡討論了三天，最後還是看向你。' },
        { when: { flagsAll: ['貼補家用'] }, text: '家裡長輩的健康出了狀況。從十八歲那筆打工錢開始，你就一直是家裡拿錢出來的那個。' },
        { text: '家裡長輩的健康出了狀況，誰來處理，變成一個很現實的問題。' }
      ],
      options: [
        { id: 'care_f', requires: { gender: 'F' }, label: '大家看向你，好像照顧本來就該是你的事', effects: { bond: 1, self: -2, achieve: -1 }, flags: ['照顧', '長輩生病'], next: CH5_POOL },
        { id: 'money_m', requires: { gender: 'M' }, label: '你被期待的角色是出錢，不是出時間', effects: { money: -2, bond: 1 }, next: CH5_POOL },
        // 花錢解掉日常負擔的人，第6章那個「生活繞著這件事打轉」的長照節點就不該照樣套上去
        { id: 'hire_caregiver', label: '花錢請了看護，減輕一些負擔', effects: { money: -2, self: 1 }, flags: ['請看護', '長輩生病'], next: CH5_POOL },
        // 前面兩個是性別限定，少了這個的話不論男女都只看得到兩個選項
        { id: 'institution', label: '送去機構，親戚開始在群組裡說你不孝', effects: { self: 1, health: 1, money: -1, bond: -1 }, flags: ['送機構', '長輩生病'], next: CH5_POOL }
      ]
    },

    n5_body_signal: {
      id: 'n5_body_signal', chapter: 5, title: '身體的訊號', ageRange: '28–35歲',
      text: '你已經好幾年沒有好好做過健檢了。身體有些訊號，你處理的方式是{醫療資訊來源}。',
      options: [
        { id: 'ignore', label: '告訴自己，再忙一段時間就好', effects: { health: -1, achieve: 1, self: -1 }, next: CH5_POOL },
        { id: 'check', label: '抽空去檢查了一次。報告上有幾個字讓你多想了一下，但你把它處理掉了', effects: { health: 2, money: -1, self: -1 }, next: CH5_POOL },
        { id: 'delegate_worry', label: '把這件事丟給旁邊的人念，自己還是沒去', effects: { health: -1, bond: -1 }, next: CH5_POOL },
        // 有錢沒時間的人真的會走這條：拿錢換回一點身體，不必拿成就去換
        { id: 'pay_for_it', label: '花錢做了最貴的那種全身健檢，順便請了教練', effects: { health: 2, money: -2 }, next: CH5_POOL },
        // 爸媽是醫生的人，這件事的成本跟別人完全不一樣
        { id: 'a_call_away', requires: { flagsAny: ['專業家庭', '富裕'] }, label: '一通電話就掛到號。該處理的當天就處理掉了，你沒有排隊過', effects: { health: 3, money: -1, self: -1 }, next: CH5_POOL }
      ]
    },

    n5_overwork: {
      id: 'n5_overwork', chapter: 5, title: '超支的日子', ageRange: '28–35歲',
      text: '為了那個位置，你開始了一段長時間透支的日子。',
      options: [
        { id: 'could_stop', requires: { flagsAny: ['富裕', '有靠山'] }, label: '你其實不必這樣。某天你就真的停了，家裡什麼都沒說', effects: { health: 2, self: 1, achieve: -2 }, next: OVERWORK_NEXT },
        { id: 'push_through', label: '連續好幾個月加班到最後一班車，有一次騎車回家時差點打瞌睡', effects: { achieve: 1, health: -2 }, flags: ['疲勞駕駛'], next: OVERWORK_NEXT },
        { id: 'pace_self', label: '試著把節奏放慢一點，升遷排在後面一點', effects: { self: 1, health: 1 }, next: OVERWORK_NEXT },
        { id: 'burn_bridge', label: '直接跟主管說做不到，關係從此有點尷尬', effects: { bond: -1, self: 1, achieve: -1 }, next: OVERWORK_NEXT }
      ]
    },

    n5_accident: {
      id: 'n5_accident', chapter: 5, title: '那場車禍', ageRange: '28–35歲',
      text: '你的代步工具是{交通工具}。那天你趕時間，或者只是太累，一個閃神，車禍發生了。',
      options: [
        { id: 'own_injury', label: '傷的是自己，復原花了比你想的更久的時間', effects: { health: -2, money: -1 }, next: CH5_POOL },
        { id: 'hit_someone', label: '撞到了人，責任在你，賠償跟自責一起壓上來', effects: { money: -2, bond: -1, self: -1 }, flags: ['車禍責任'], next: CH5_POOL },
        { id: 'long_lawsuit', label: '對方全責，但你被卷進一場拖了三年的官司', effects: { self: -2, achieve: -1 }, flags: ['車禍訴訟'], next: CH5_POOL }
      ]
    },

    n5_debt: {
      id: 'n5_debt', chapter: 5, title: '算不過來的那筆錢', ageRange: '28–35歲',
      text: '有一筆錢，你怎麼算都算不過來。',
      options: [
        { id: 'credit_cash_card', label: '辦了現金卡，先撐過去', effects: { money: 1, self: -1 }, flags: ['借貸'], next: CH5_POOL },
        { id: 'borrow_family', label: '跟家人借了一筆，說好會還', effects: { bond: -1, money: 1 }, flags: ['借貸'], next: CH5_POOL },
        { id: 'grind_through', label: '不借，靠自己硬撐過去，日子變得很緊', effects: { health: -1, self: 1 }, next: CH5_POOL }
      ]
    },

    n5_era_storm: {
      id: 'n5_era_storm', chapter: 5, title: '那一場風暴', ageRange: '28–35歲',
      text: [
        { when: { generation: 1975 }, text: '1997年，亞洲金融風暴，你的產業正好在浪頭上。' },
        { when: { generation: 1990 }, text: '一場突然來的疫情，把你原本的計畫全部打亂。' },
        { text: '2035年那場推想中的變動，正好在你最沒有準備的時候發生。整個世代都在說{錯過的機會}，而你那時候剛好在別的地方忙。' }
      ],
      options: [
        { id: 'hit_hard', label: '這場風暴直接打在你身上，損失很實際', effects: { money: -2, self: -1 }, flags: ['遇到風暴'], next: CH5_POOL },
        { id: 'dodge', label: '算你運氣好，躲過了最壞的那一波，但身邊有人沒躲過', effects: { bond: -1, self: 1 }, next: CH5_POOL },
        { id: 'miss_opportunity', label: '風暴過後的復甦期，你因為太保守，沒跟上那波機會', effects: { achieve: -1, money: -1 }, flags: ['錯過紅利'], next: CH5_POOL }
      ]
    },

    n5_emigrate: {
      id: 'n5_emigrate', chapter: 5, title: '要不要移民', ageRange: '28–35歲',
      text: [
        { when: { flagsNone: ['成家', '有小孩'] }, text: '你認真查了一次移民的門檻、成本、要放掉什麼。在你這一代，{移民管道}。' },
        { when: { flagsNone: ['有小孩'] }, text: '政治氛圍，工作機會，或單純想換一個地方生活——你們認真討論起移民這件事。在你這一代，{移民管道}。' },
        { text: '為了孩子的教育、政治氛圍，或單純想換一個地方生活，你們認真討論起移民這件事。在你這一代，{移民管道}。' }
      ],
      options: [
        { id: 'emigrate_go', label: '最後決定搬走，把這裡的一切收掉', effects: { bond: -1, money: -2 }, flags: ['移民'], next: 'n6_career_plateau' },
        { id: 'emigrate_stay', label: '討論了很久，最後決定留下來', effects: { self: -1, bond: 1 }, next: 'n6_career_plateau' },
        { id: 'emigrate_half', label: '你一個人先過去卡位，家人晚一點再說', effects: { bond: -2, money: 1 }, flags: ['移民'], next: 'n6_career_plateau' }
      ]
    }

  });
})(window);
