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
        id: 'END_倒在辦公室', tier: 'hard', tone: 'ruin', rarity: '少見',
        when: { attr: { key: 'health', op: '<=', value: 1 }, attrs: [{ key: 'achieve', op: '>=', value: 7 }] },
        title: '倒在辦公室',
        text: '五十歲那年的心導管手術，公司裡沒有一個人真正記得你的職稱。你把一輩子最好的時間都給了那張辦公桌，換到的位置在你倒下的那一刻起，就已經有人在排隊了。'
      },
      {
        id: 'END_洗腎的日子', tier: 'hard', tone: 'ruin', rarity: '少見',
        when: { attr: { key: 'health', op: '<=', value: 1 } },
        title: '洗腎的日子',
        text: '健檢紅字你看過，但總覺得再撐一下沒關係。直到有一天，你的身體自己叫了停。現在你一週報到醫院三次，每次四小時，那些時間原本要拿去做別的事。你什麼都換到了，除了自己的身體。'
      },
      {
        id: 'END_factory15', tier: 'generation', tone: 'bittersweet', rarity: '世代限定', limitedTo: [1975],
        // 只能透過 n1_labor 的 factory 選項直接觸發（state.endingId 已經設定），不該被一般判定撿到——
        // 光有「勞動」旗標不代表走過那條路，所以這裡故意回傳 false
        when: function () { return false; },
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
        id: 'END_一個人走的', tier: 'generation', tone: 'ruin', rarity: '少見', limitedTo: [1975],
        when: function (state) { return state.generation === 1975 && state.chapter >= 7 && state.attrs.bond <= 1; },
        title: '一個人走的',
        text: '房東發現的時候，已經是三天以後。你這一輩子認識過不少人，但走到最後，沒有一個電話是打得通、也想得起來要打的。存摺最後一頁，蓋章的是別人替你蓋的。'
      },
      {
        id: 'END_被騙走的晚年', tier: 'generation', tone: 'ruin', rarity: '少見', limitedTo: [1975, 1990],
        when: function (state) {
          return [1975, 1990].indexOf(state.generation) !== -1 && state.chapter >= 7 &&
            state.attrs.bond <= 3 && state.attrs.money >= 3 && state.attrs.money <= 6;
        },
        title: '被騙走的晚年',
        text: '一通電話，換走了你一輩子才存下來的積蓄。事後你想不明白的，反而不是那筆錢——是那段時間裡，好像也沒有誰真的會第一時間發現你出事。'
      },
      {
        id: 'END_每天一瓶', tier: 'flagCombo', tone: 'ruin', rarity: '少見',
        when: { flagsAll: ['壓抑'], attr: { key: 'bond', op: '<=', value: 3 } },
        title: '每天一瓶',
        text: '沒有哪一天是崩潰的那一天，只有一連好幾年，慢慢往下沉。你這輩子很少讓自己真的難過出來，於是它換了另一種方式留下來。日子還是照樣過，只是每天都要靠點什麼，才撐得過那個晚上。'
      },
      {
        id: 'END_竹科的股票', tier: 'generation', tone: 'good', rarity: '少見', limitedTo: [1975],
        when: { generation: 1975, attr: { key: 'money', op: '>=', value: 7 } },
        title: '竹科的股票',
        text: '那年配到的股票，你到現在都還記得掛牌那天的價格。賣早了還是沒賣，身邊的人各有各的版本，但你手上這份存摺，看起來是對的那一種。運氣占了不小的比例，你自己也承認。'
      },
      {
        id: 'END_無子的晚年', tier: 'generation', tone: 'neutral', rarity: '少見', limitedTo: [2005],
        when: function (state) { return state.generation === 2005 && state.chapter >= 7 && !!state.flags['丁客'] && state.attrs.bond <= 5; },
        title: '無子的晚年',
        text: '當年決定不生的時候，你想的是留給彼此更多空間。現在你想的是，等你們兩個都老到不能自己來，誰會是那個站出來的人。這個問題，你這代人比上一代更早想，也想得更清楚，但清楚不代表有答案。'
      },
      {
        id: 'END_法拍', tier: 'flagCombo', tone: 'ruin', rarity: '稀有', limitedTo: [1990],
        when: { generation: 1990, flagsAll: ['高槓桿'], attr: { key: 'money', op: '<=', value: 2 } },
        title: '法拍',
        text: '那間你以為是終點的房子，門上貼了紅單。你算過很多次，怎麼樣都補不回那個缺口。搬出去那天，你在巷口回頭看了一眼，那扇門後面本來應該是你的下半生。'
      },
      {
        id: 'END_三明治世代', tier: 'generation', tone: 'bittersweet', rarity: '世代限定', limitedTo: [1990],
        when: { generation: 1990, flagsAll: ['照顧'], attr: { key: 'self', op: '>=', value: 3 }, attrs: [{ key: 'self', op: '<=', value: 6 }] },
        title: '三明治世代',
        text: '上面老的要顧，下面小的要顧，中間還有一份工作要撐著。你把自己排在最後一位，久到差點忘記自己也需要被顧。日子沒有崩掉，但也沒有一天是真的鬆的。你這代人，好像天生就是拿來被夾在中間的。'
      },
      {
        id: 'END_22K的逆襲', tier: 'generation', tone: 'good', rarity: '少見', limitedTo: [1990],
        when: { generation: 1990, attr: { key: 'achieve', op: '>=', value: 7 } },
        title: '22K的逆襲',
        text: '起薪二萬二的那一年，你不覺得自己以後會走到現在這個位置。這中間沒有捷徑，就是一年一年，一格一格往上爬。偶爾想起當年那張薪資單，你會笑一下，不是苦笑，是真的覺得好笑。你花了比別人更久的時間，但你到了。'
      },
      {
        id: 'END_歸零', tier: 'flagCombo', tone: 'ruin', rarity: '少見',
        when: { flagsAll: ['投機'], attr: { key: 'money', op: '<=', value: 2 } },
        title: '歸零',
        text: '帳戶裡剩下的數字，跟你以為自己曾經擁有過的差了一個零。你不是沒賺過，是後來全部還了回去，還多還了利息。剩下的餘生，你都在還那個「曾經有過」的數字。有些帳，一旦歸零，就很難再重新開始算。'
      },
      {
        id: 'END_長照黑洞', tier: 'flagCombo', tone: 'ruin', rarity: '少見',
        when: { flagsAll: ['照顧'], attr: { key: 'self', op: '<=', value: 2 } },
        title: '長照黑洞',
        text: '照顧父母那幾年，你的人生像被按了暫停鍵。等你終於從那個角色裡走出來，才發現外面的世界已經換了一輪，而你自己也老了一截。沒有人虧待你，也沒有人真的謝謝你。你的存摺停在三十五歲那頁，之後很久才又開始蓋章。'
      },
      {
        id: 'END_拉進去的人', tier: 'flagCombo', tone: 'ruin', rarity: '少見',
        when: { flagsAll: ['宗教金錢'], attr: { key: 'bond', op: '<=', value: 2 } },
        title: '拉進去的人',
        text: '一開始你只是想分享一個「好機會」給在乎的人。後來連你自己都算不清楚，到底把多少人拉了進去。現在你手機裡那些名字，大部分都不會再接你電話了。你最後悔的不是錢，是那些原本會回你訊息的人。'
      },
      {
        id: 'END_職災', tier: 'flagCombo', tone: 'ruin', rarity: '少見', limitedTo: [1975, 1990],
        when: { generation: [1975, 1990], flagsAll: ['技職'], attr: { key: 'health', op: '<=', value: 3 } },
        title: '職災',
        text: '手上這門技術，是你這輩子最實在的本錢。只是身體用久了，總有一天要付出代價。你不是不知道要小心，只是工作不會等你小心夠了才繼續。本錢用完了，剩下的日子，靠的是別人的照顧。'
      },
      {
        id: 'END_那場車禍之後', tier: 'flagCombo', tone: 'ruin', rarity: '少見',
        when: { flagsAny: ['車禍責任', '車禍訴訟'] },
        title: '那場車禍之後',
        text: '那一天只有幾秒鐘，但後面的日子被拉得很長。有的帳可以慢慢還，有的責任卻怎麼還都還不完。你偶爾還是會想，如果那天早五分鐘出門，會不會一切都不一樣。但事情已經發生了，你只能繼續往前走。'
      },
      {
        id: 'END_兩邊都不是家', tier: 'flagCombo', tone: 'bittersweet', rarity: '少見',
        when: { flagsAll: ['移民'], attr: { key: 'bond', op: '<=', value: 3 } },
        title: '兩邊都不是家',
        text: '那裡沒有你的過去，這裡沒有你的現在。你在異地把日子過得還算過得去，卻怎麼都覺得少了一塊。回來探親的時候，發現這裡也已經不太認得你了。兩個地方你都待過，卻好像都不算真正住過。'
      },
      {
        id: 'END_異地扎根', tier: 'flagCombo', tone: 'good', rarity: '常見',
        when: { flagsAll: ['移民'] },
        title: '異地扎根',
        text: '花了好幾年，你才不再覺得自己是個外人。現在這裡有你買的房子、你熟悉的超市動線、幾個真正的朋友。故鄉還是故鄉，只是不再是你唯一能稱作家的地方。你把根重新種了一次，這次它真的活了下來。'
      },
      {
        id: 'END_差一年', tier: 'flagCombo', tone: 'bittersweet', rarity: '常見',
        // 「你什麼都做對了，只是晚了一屆」——所以必須真的沒撈到，
        // 光是遇過風暴不算：時代旗標太廣，只憑旗標會把後面的屬性型結局全部蓋掉
        // bond<=6 也是必要的：身邊還坐滿人的話，這輩子就不算「什麼都沒撈到」，
        // 那是「家裡還很熱鬧」的故事，不該被這個攔在前面
        when: { flagsAny: ['遇到風暴', '錯過紅利', '被取代'], attr: { key: 'achieve', op: '<=', value: 6 }, attrs: [{ key: 'money', op: '<=', value: 5 }, { key: 'bond', op: '<=', value: 6 }] },
        title: '差一年',
        text: '你回頭檢查過所有的決定，每一步在當時看起來都合理。問題從來不是你做錯了什麼，而是時機。早一年或晚一年，故事可能完全不一樣。可惜人生沒有重新選一次時間點這個選項，你只能帶著這個「差一點」，繼續往前走。'
      },
      {
        id: 'END_循環的重量', tier: 'flagCombo', tone: 'bittersweet', rarity: '少見',
        when: { flagsAll: ['複製教養'] },
        title: '循環的重量',
        text: '你曾經下定決心，絕對不要變成當年那個對你說這句話的大人。可是有一天，你聽見自己對孩子說出一模一樣的句子，語氣連停頓都一樣。你想收回來，但話已經說出去了。你變成了你曾經最不想變成的那種人，而你甚至沒發現是什麼時候開始的。'
      },
      {
        id: 'END_剛好的人生', tier: 'attribute', tone: 'good', rarity: '隱藏', hidden: true,
        when: function (state, h) { return h.isMidBand(state); },
        title: '剛好的人生',
        text: '你的存摺，沒有哪一頁特別亮眼，也沒有哪一頁特別糟。五個軸線都落在中間，不高不低，像是有人刻意調過的天秤。這比衝到極端難得多——大部分人不是活成太用力，就是活成太委屈。你剛好，就只是剛好。'
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
        id: 'END_家裡還很熱鬧', tier: 'attribute', tone: 'good', rarity: '常見',
        when: { attr: { key: 'bond', op: '>=', value: 7 } },
        title: '家裡還很熱鬧',
        text: '你這輩子沒賺到什麼大錢，職稱也就那樣，同學會上你通常是坐在旁邊聽別人講的那一個。可是每到過年，你家永遠是最多人的那一間。孩子會回來，老朋友還是會約，連隔壁鄰居都習慣進來坐一下再走。到這個年紀你才看懂，時間放在哪裡，哪裡就會長出東西來。'
      },
      {
        id: 'END_沒被時代選中', tier: 'attribute', tone: 'bittersweet', rarity: '常見',
        when: { attr: { key: 'achieve', op: '<=', value: 3 }, attrs: [{ key: 'self', op: '>=', value: 7 }] },
        title: '沒被時代選中',
        text: '你回頭看自己做過的每個決定，找不到哪一步是明顯的錯。每個選擇在當時都合理，只是時代轉了個方向，沒往你這邊來。你沒有變得世故，也沒有怨恨誰，只是清楚知道，這不是你的問題。有些牌，就是輪不到你。'
      },
      {
        id: 'END_自己的路', tier: 'attribute', tone: 'good', rarity: '常見',
        // 原本還要求 achieve>=6，但結局文字講的是「你不覺得自己選錯」，跟成就無關——
        // 那個門檻等於在說「照自己想要的活，還得混出名堂才算數」，剛好是這個結局要反對的事
        when: { attr: { key: 'self', op: '>=', value: 7 }, attrs: [{ key: 'health', op: '>=', value: 4 }] },
        title: '自己的路',
        text: '你走的路，跟身邊大部分人都不太一樣，但走到現在，你不覺得自己選錯了。中間當然有懷疑過、動搖過，但每次回頭看，你都還是慶幸自己沒有換方向。這條路沒有捷徑可以抄，你是真的一步一步走出來的。'
      },
      {
        id: 'END_有得有失', tier: 'fallback', tone: 'neutral', rarity: '常見',
        when: function () { return true; },
        title: '有得有失',
        text: '你的存摺上，好的頁跟差的頁交錯著出現，像大部分人的人生一樣。你沒有一次全拿，也沒有一次全輸，每一頁背後都有代價，你也都付了。回頭看，你會說這是一段普通的人生，普通到有點想哭。這樣的存摺，拿給任何人看，大概都看得懂。'
      }
    ],

    // 個人化段落：結局骨架選定後，依旗標再插入最多兩段，讓同一個結局每次讀起來不完全一樣
    personalizations: [
      { when: { flagsAll: ['成家'] }, text: '至少，家裡有人活著看到你成家的那一天。' },
      { when: { flagsAll: ['有小孩'] }, text: '孩子長大後，偶爾還是會問起你這些年是怎麼走過來的。' },
      { when: { flagsAll: ['高槓桿'], attrs: [{ key: 'money', op: '>=', value: 3 }] }, text: '那間你賭下所有存款買的房子，最後還是留住了。' },
      { when: { flagsAll: ['出國'] }, text: '你在國外的那幾年，現在回想起來，是唯一一段完全屬於自己的時間。' },
      { when: { flagsAll: ['宗教金錢'] }, text: '後來你花了很長時間，才把那些被你拉進去的人，一個一個道歉過一輪。' },
      { when: { flagsAll: ['壓抑'] }, text: '你這輩子很少讓人看到你真正的情緒，包括在最後一次。' },
      { when: { flagsAll: ['照顧'] }, text: '照顧那幾年，沒有人真正謝謝過你，包括你自己。' },
      { when: { flagsAll: ['同性伴侶'], flagsAny: ['已出櫃'] }, text: '至少在最後，身邊的人知道你是誰，也知道你愛過誰。' },
      { when: { flagsAll: ['移民'] }, text: '偶爾你還是會用母語做夢，醒來覺得有點恍神。' },
      { when: { flagsAll: ['西進'] }, text: '故鄉那個小鎮，你現在回去，已經要靠導航才找得到路。' },
      { when: { flagsAll: ['北漂'] }, text: '這個城市住了這麼多年，你還是覺得自己隨時可以打包走人。' },
      { when: { flagsAll: ['借貸'] }, text: '那筆錢後來還是還完了，只是花的時間比你想的長很多。' }
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
