(function (global) {
  'use strict';
  var UNREALIZED = global.UNREALIZED = global.UNREALIZED || {};

  // tier 判定順序見 engine.js 的 TIER_ORDER：hard → generation → flagCombo → attribute → fallback
  UNREALIZED.endings = {

    full: [
      {
        id: 'END_雙卡人生', tier: 'hard', tone: 'ruin', rarity: '稀有', limitedTo: [1975, 1990],
        when: { generation: [1975, 1990], flagsAll: ['借貸'], attr: { key: 'money', op: '<=', value: 1 } },
        title: '雙卡人生',
        text: '利息像水一樣，你怎麼填都填不滿那個洞。你以為借的是三個月的週轉，結果變成十年的循環利息。每個月薪水進來的那一天，還沒過夜就已經是別人的錢。你這輩子，好像沒有一天真的是自己的。'
      },
      {
        id: 'END_洗腎的日子', tier: 'hard', tone: 'ruin', rarity: '少見',
        when: { attr: { key: 'health', op: '<=', value: 1 } },
        title: '洗腎的日子',
        text: '健檢紅字你看過，但總覺得再撐一下沒關係。直到有一天，你的身體自己叫了停。現在你一週報到醫院三次，每次四小時，那些時間原本要拿去做別的事。你什麼都換到了，除了自己的身體。'
      },
      {
        id: 'END_factory15', tier: 'generation', tone: 'bittersweet', rarity: '世代限定', limitedTo: [1975],
        when: { generation: 1975, flagsAll: ['勞動'] },
        title: '十五歲的工廠',
        text: '國中畢業那年，你以為只是先幫忙一段時間。三十年後回頭看，那段時間就是你的人生。同學裡有人念了大學、當了老師，你們偶爾在市場遇到，笑一笑就過去了。你沒有後悔，只是常常想，如果那年家裡撐得住，會不會有別的版本。'
      },
      {
        id: 'END_一輩子沒說出口', tier: 'generation', tone: 'bittersweet', rarity: '世代限定', limitedTo: [1975],
        when: { generation: 1975, flagsAny: ['未出櫃'] },
        title: '一輩子沒說出口',
        text: '你這一輩子，身邊的人只知道你「沒有結婚」。有些事你以為藏得很好，其實大家都猜到了，只是沒人問，你也沒人說。訃聞上會寫著「終身未婚」，那五個字，是這個世代唯一准你用的版本。你不是沒有愛過，只是那份愛，從沒被允許有名字。'
      },
      {
        id: 'END_登記那天', tier: 'generation', tone: 'good', rarity: '少見', limitedTo: [1990, 2005],
        when: { generation: [1990, 2005], flagsAll: ['同性伴侶'], flagsNone: ['未出櫃'], attr: { key: 'bond', op: '>=', value: 7 } },
        title: '登記那天',
        text: '排隊的隊伍很長，你們手牽著手，前面跟後面的人都在做同一件事。等了那麼多年，這件事真的發生的時候，沒有想像中戲劇化，就是一張紙、一個章。晚上你們吃了一頓普通的晚餐，像所有結了婚的人那樣，平凡地開始接下來的日子。有些等待，終於等到了。'
      },
      {
        id: 'END_循環的重量', tier: 'flagCombo', tone: 'bittersweet', rarity: '少見',
        when: { flagsAll: ['複製教養'] },
        title: '循環的重量',
        text: '你曾經下定決心，絕對不要變成當年那個對你說這句話的大人。可是有一天，你聽見自己對孩子說出一模一樣的句子，語氣連停頓都一樣。你想收回來，但話已經說出去了。你變成了你曾經最不想變成的那種人，而你甚至沒發現是什麼時候開始的。'
      },
      {
        id: 'END_靜靜的如果', tier: 'attribute', tone: 'bittersweet', rarity: '常見',
        when: function (state, h) {
          var others = ['money', 'achieve', 'bond', 'health'].reduce(function (sum, k) { return sum + state.attrs[k]; }, 0) / 4;
          return state.attrs.self <= 3 && others >= 5;
        },
        title: '靜靜的如果',
        text: '外人看你的存摺，會覺得這是一份很體面的人生：錢夠用、職稱過得去、家人也都還在。只有你自己知道，裡面很多頁蓋的章，不是你想蓋的。你把該做的都做了，只是那些選擇，更像是別人替你做的決定。日子過得下去，只是不是你的日子。'
      },
      {
        id: 'END_有得有失', tier: 'fallback', tone: 'neutral', rarity: '常見',
        when: function () { return true; },
        title: '有得有失',
        text: '你的存摺上，好的頁跟差的頁交錯著出現，像大部分人的人生一樣。你沒有一次全拿，也沒有一次全輸，每一頁背後都有代價，你也都付了。回頭看，你會說這是一段普通的人生，普通到有點想哭。這樣的存摺，拿給任何人看，大概都看得懂。'
      }
    ],

    // 中途收尾：第2章起可用，依「當下年齡＋最突出屬性」判定，先中者勝
    mid: [
      {
        id: 'MID_這樣就好', hidden: true, rarity: '隱藏',
        when: function (state, h) { return h.isMidBand(state) && state.attrs.self >= 6; },
        title: '這樣就好',
        text: '你把存摺闔上，不是因為走不下去了，而是因為你剛好知道，這裡是個好地方停下來。錢夠、身體還行、關係沒斷，心裡也沒有非做不可的事沒做。很少人能在什麼都還好的時候，自己決定停下來。知道什麼時候夠了，本身就是一種很難得的能力。'
      },
      {
        id: 'MID_太早停下', rarity: '常見',
        when: function (state) { return state.chapter <= 2 && (state.attrs.self <= 3 || state.attrs.health <= 3 || state.attrs.bond <= 3); },
        title: '太早停下',
        text: '你把存摺收起來，但心裡有個聲音問，是不是太早了。這個階段的你，身上已經有些傷還沒好，你選擇先不看它，直接闔上。也許哪天你會想回來翻一翻，看看當時到底發生了什麼事。現在，你只是需要先停一下。'
      },
      {
        id: 'MID_未完的存摺', rarity: '常見',
        when: function (state) { return state.chapter <= 2; },
        title: '未完的存摺',
        text: '你的存摺才剛開始蓋章，頁面還很空。這個決定沒有對錯，人生本來就不是非要走到最後一頁才能停。只是這本存摺，故事才剛要開始而已。'
      },
      {
        id: 'MID_十八歲的自己會怎麼看', rarity: '少見',
        when: function (state, h) { return h.minAttrKey(state) === 'self'; },
        title: '十八歲的自己會怎麼看',
        text: '你停下來想了一下，不知道十八歲的自己，看到現在的選擇會怎麼想。也許會點頭，也許會很失望，你自己也說不準。這個問題，你決定先留著，晚一點再回來想。'
      },
      {
        id: 'MID_還在路上', rarity: '常見',
        when: function () { return true; },
        title: '還在路上',
        text: '你把存摺收好，還沒到蓋上結案章的時候。日子還在走，帳還沒算完，這一頁只是中間的一頁。之後要往哪裡去，還有得選。'
      }
    ]
  };
})(window);
