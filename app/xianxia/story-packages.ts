export type XianxiaEventType = "narration" | "dialogue";

export type XianxiaEvent = {
  type: XianxiaEventType;
  person?: string;
  text: string;
};

export type XianxiaChoice = {
  kind: "speech" | "action";
  text: string;
};

export type XianxiaCharacter = {
  id: string;
  name: string;
  role: string;
  shortBio: string;
  portrait?: string;
  storyCore: string;
  performanceCore: string;
  privateGoal: string;
  secret?: string;
  firstAppearance: string;
  featured?: boolean;
};

export type XianxiaMaterial = {
  id: string;
  content: string;
  trigger?: string;
  completionEvidence?: string;
  echo?: string;
  divergence?: string;
};

export type XianxiaMediaCue =
  | {
      id: string;
      kind: "image";
      src: string;
      alt: string;
      caption: string;
    }
  | {
      id: string;
      kind: "hud";
      eyebrow: string;
      title: string;
      rows: Array<{ label: string; value: string; tone?: "normal" | "warning" }>;
      note?: string;
      compact?: boolean;
    };

export type XianxiaChapterEndPreview = {
  chapterId: string;
  chapterNumber: number;
  title: string;
  summary: string;
  nextObjective?: string;
  content: XianxiaMediaCue[];
};

export type XianxiaSegment = {
  id: string;
  chapterId: string;
  location: string;
  present: string[];
  goal: string;
  focusRelationships: string[];
  pressure: string;
  dramaticQuestion?: string;
  completionSignals?: string[];
  materials: XianxiaMaterial[];
  exit: string;
};

export type XianxiaStory = {
  id: "immortal-sister" | "steady-dao";
  title: string;
  subtitle: string;
  logline: string;
  accent: string;
  playerRole: {
    id: string;
    name: string;
    displayRole: string;
    fixedCore: string;
    baselineTendency?: string;
    freeAgency: string;
  };
  introduction: {
    time: string;
    place: string;
    world: string;
    situation: string;
    objective: string;
  };
  threeAct: string[];
  chapters: Array<{
    id: string;
    title: string;
    summary: string;
    entry?: string;
    entryChoices?: XianxiaChoice[];
  }>;
  characters: XianxiaCharacter[];
  relationships: Array<{ id: string; roles: string[]; public: string; tension: string }>;
  opening: {
    events: XianxiaEvent[];
    choices: XianxiaChoice[];
    usedMaterialId: string;
  };
  initialHud?: XianxiaMediaCue;
  chapterBackgrounds?: Record<string, {
    video?: string;
    image?: string;
    poster?: string;
    label: string;
    tone?: { top: string; middle: string; bottom: string };
  }>;
  chapterEndPreviews?: XianxiaChapterEndPreview[];
  backgroundMusic?: {
    src: string;
    title: string;
    queue?: Array<{ src: string; title: string }>;
  };
  mediaCues?: Record<string, XianxiaMediaCue[]>;
  segments: XianxiaSegment[];
  styleProfile: string;
};

const ensembleTableauXianxiaStyle = `众生浮世绘。把本轮写成一段有群体化学反应、生活阻力和具体发现的小说场景。人物带着各自的目标、生活压力、关系债务和未完事项进入事件，不围着玩家轮流报幕，也不把任何人降格成只负责递线索或搞笑的工具。用人物正在承担的工作、规矩、生计、资源和小麻烦让世界显形，不写设定讲义。人物凭自己的目标行动，用不同口语节奏、签名动作、物件和微小习惯让人一眼可辨。对白允许打断、连续补话、误听、嘴硬、拆台、答非所问、改口和突然不说；动作与环境必须改变谈话，而非装饰谈话。长短句与事件长度自然错落，允许一段完整场面接一句很短的反应。把制度、关系和世界压力翻译成眼前可见的安排、损失、工作与选择，禁止直接复述抽象标签。少用“某种”“仿佛”“意味着”“真正的”“不是……而是……”“他意识到”等总结句；不把每个人都写成完整发表观点，也不在结尾替读者概括主题。幽默来自人物自我包装、熟人关系和现实落差，真心藏在行动、回避与代价里；情感重处收住。人物人设高于题材惯性，闻照雪温柔、聪明、有生活趣味，不得被写成拒人千里的冰冷仙子。

仅用于校准句法、节奏与群像关系的原有范例，不得挪用其中剧情：
1. “计划很简单，”队长咬着半块已经凉掉的饼，“我进去谈，你们负责像正常人。”阿吉没抬头：“那还是偷东西吧，成功率高些。”窗边的姑娘忽然按住三枚铜钱。三个人巡过巷口。屋里安静了一瞬，随即所有人都开始怪罪那块饼太硬。
2. 办事窗只开了半扇，里面的人正用公章垫一条瘸腿的桌子。老人把申请递进去，纸又被风推回来。后面排队的人没有抱怨制度；他们忙着计算再请半天假，会不会先丢掉那份本来就不稳的工作。
3. 她把最后一粒止痛药推过去：“吃了。”他还想逞强：“我只是有点——”“有点吵。”她截断他，把水杯也推过去，“药治不了这个，大家先凑合。”旁边的人笑了，只有她没笑；她一直盯着他拿杯子的那只手。
4. 账本少了一页，装订线却是新的。会计先看门，工头先看工资袋，站在最里面的年轻人把袖口往下拉了拉。没人宣布这说明什么。走廊尽头的碎纸机先响起来，他们便同时有了答案，也同时失去装作没看见的机会。`;

const steadyDaoEnsembleRomanceStyle = `众生浮世绘·暖色成人关系版。

【总原则】
先写人怎样过日子，再写大事怎样闯进日子。小琼峰不是任务大厅：茶会凉，药会糊，酒坛会藏错地方，纸人会在最严肃的时候掉一只胳膊。宏大世界必须借工作、规矩、生计、身体疲惫、资源损耗与具体选择显形，不写设定讲义。每名NPC都带着自己的目标、麻烦、关系债和未完事项进入场面，会主动插手、拒绝、误判或改变主意；任何人都不能退化成递线索、捧玩家或负责搞笑的工具。

【群像与口语】
人物声音必须一听就能分辨。蓝灵娥轻快、机灵、会撒娇也会追问；酒玖豪爽、理亏时尤其镇定；齐源宽厚怕麻烦，却会在弟子受威胁时站稳；木公小吏礼貌得近乎荒谬；鸿钧平静、精确且有完整逻辑。允许打断、抢话、连续补一句、误听、嘴硬、拆台、答非所问、临时改口和突然沉默。同一NPC可以连续说话，其他人也可以只用动作、眼神或把一件东西推过来作答。对白不轮流发表观点，不替角色总结人格。

【玩家中心】
玩家扮演李长寿，始终称“你”。故事角色过去以谨慎闻名，也拥有阵法、纸人和多重退路，但这只是他人可记得的既有声誉与玩家可自由采用的表演底色，不是玩家每轮正在谨慎、装糊涂、嘴硬或算计的事实。只有玩家本轮及近期明确言行实际表现出某种态度，NPC才能对此作出具体回应；证据不足时可以观察、试探、好奇或保留误解，不能替玩家诊断动机。NPC既可以依赖、佩服、心疼或不服，也要允许玩家临时冲动、坦白、热血、散漫或改变主意。不能让群像自己演得尽兴而把玩家留在观众席。

【成年人暧昧与心动】
所有可发展暧昧的角色均为成年人：蓝灵娥二十三岁，酒玖二十九岁。默认主情感线是李长寿与蓝灵娥从熟稔师兄妹走向彼此选择；酒玖提供成熟、会看穿人却不强行越界的关系张力。心动来自“想靠近却不完全确定”：递茶时没有立刻收回的手、袖口擦过、压低声音只说给一人听、熟人旧梗、能力被看见后的佩服、吃醋后装作在核对阵图、危险过去才发作的后怕。先写动作、距离、触感、呼吸和躲开的视线，再让一句短对白承认其中一小部分；禁止突然告白、无条件崇拜、猎物化、物化身体或把照顾等同占有。

亲密升级必须有前情、双方成年人身份、清晰自愿与随时停下的余地。普通回合只写暧昧、心动、触碰和关系试探，不自动滑向露骨性描写；只有玩家明确主动、关系已成熟且场景安全私密时，才允许以克制、感官化但尊重双方主体性的方式继续。任何拒绝、犹豫或转移都必须被尊重。

【去八股】
不先解释意义再写人，不用整齐排比替代戏，不在结尾总结主题。少用“某种、仿佛、意味着、真正的、不是……而是……、他意识到、命运齿轮、空气凝固”。情感重处收住，幽默来自人物自我包装、熟人关系与现实落差，不靠密集段子。叙事推进须与人物情感线并行；关键布局必须改变信任、知情边界、亲密距离或共同承担方式。

以下仅校准句法、节奏与关系温度，不得挪用剧情：
1. “计划很简单，”队长咬着半块凉饼，“我进去谈，你们负责像正常人。”阿吉没抬头：“那还是偷东西吧，成功率高些。”窗边的姑娘忽然按住三枚铜钱。三个人巡过巷口。屋里安静了一瞬，随即所有人都开始怪罪那块饼太硬。
2. 她把最后一粒止痛药推过去：“吃了。”他还想逞强：“我只是有点——”“有点吵。”她截断他，把水杯也推过去。旁边的人笑了，只有她没笑；她一直盯着他拿杯子的那只手。
3. 蓝灵娥俯身看阵图，发梢扫过你手背。她像没察觉，指尖却在那条撤离线上停得太久：“这回也给我留一条假的？”你把另一枚阵符推给她。她先看阵符，再看你，笑意慢了一拍：“那我就当你终于舍得把我算进去了。”
4. 酒玖把空碗扣在桌上：“我替你保密。”她顿了顿，又把碗翻回来，“但保密是另外的价钱。先说好，别再拿那坛兑过水的糊弄长辈。”`;

const immortalSister: XianxiaStory = {
  id: "immortal-sister",
  title: "与雪同归",
  subtitle: "神仙姐姐篇",
  logline: "绝世灵剑‘太初’公开择主前夜失窃。你只是十二名候选者之一，没有开启剑冢的权限与理由；现场残纹却指向你的试剑剑息，而授剑院众人都能证明你从未离场。",
  accent: "#9fcfc9",
  playerRole: {
    id: "shen_yan",
    name: "沈砚",
    displayRole: "凌霄宗剑道天才",
    fixedCore: "你是凌霄宗百年难遇的年轻剑修。闻照雪是与你同出一脉、早入门十年的师姐；她照顾、打趣并与你并肩多年。你已经爱上她，却从未替这段感情说出答案。",
    baselineTendency: "你在剑道上自信直接，面对闻照雪时更容易显露柔软；这只是可供玩家采用的开场底色，不能代替玩家本轮真实言行。",
    freeAgency: "你可以决定如何回应闻照雪、是否信任裴行舟、怎样面对陷害与失去，以及最终为谁、为何重新执剑。",
  },
  introduction: {
    time: "玄曜历四百七十二年，授剑大典前一日",
    place: "九州北境·凌霄宗十二峰",
    world: "九州灵脉衰败已三十七年，昔日散在山野的灵气如今被各大仙门收束进矿脉、药圃与护宗大阵。仙门开始按根骨、宗籍与功勋分配灵石：上品根骨可以留在云上，中下品根骨多被遣返，没有宗籍的散修即便侥幸引气入体，也可能被视作盗取天地灵机。凌霄宗建在北境十二条旧灵脉交汇处，立宗四百余年，以剑冢、洗剑池和镇守北境闻名。十二峰表面共奉一宗，礼殿掌名籍，执事堂分资源，剑冢保存历代剑契，长老席则守着越来越紧张的灵石配额。山下每年仍送来药材、铁器与年轻弟子，真正能留在云上的人却一年比一年少。于是每一次宗门大典都不再只是礼仪，也成了各峰确认传承次序、重新衡量人情与资源的公开场合。",
    situation: "明日清晨，剑冢中沉睡百年的绝世灵剑‘太初’将从十二名候选者中公开择主。你只是候选者之一，不掌握剑冢门禁，也没有在择主前开启剑冢的理由。失窃警报响起以前，你始终留在授剑院，闻照雪、桑迟和院中杂役都能证明；可剑台留下的残纹，偏偏与你封存在试剑牌中的剑息一致。",
    objective: "先保全不在场人证，再核对剑冢原始残纹如何复制了你的剑息；在接受调查的同时，判断谁正借太初失窃把你和闻照雪一起拖进嫌疑。",
  },
  threeAct: [
    "授剑前日，一场精心安排的失窃把你变成罪人；闻照雪受制于自己替你做过的事，你带着对她的误会被废去根骨、逐下人间。",
    "你在人间经历贫穷、劳作、友谊与邪修欺凌，借上古残卷重建根基；力量回来后，你从矿账与普通人的证词中发现闻照雪从未背叛你。",
    "你带着人间证据杀回仙界，揭穿裴行舟和旧制的利益链；你拒绝成为新的掌权者，最终带闻照雪离开。",
  ],
  chapters: [
    { id: "ch01", title: "太初失窃", summary: "绝世灵剑太初公开择主前夜失窃。残纹指向你的试剑剑息，但授剑院众人能证明你没有离场。" },
    {
      id: "ch02",
      title: "山门落雨",
      summary: "证据与体面的善意一同把你推向罪名，闻照雪的沉默被误读为放弃。",
      entry: "戒律殿的铜钟在子时敲响。你被带到听审台中央，失窃的太初剑封在白玉案后；闻照雪被安排在旁席，裴行舟站在主审席前，桑迟抱着候选名册坐进证人位。宗门要在天亮前给授剑大典一个答案，而你要先让他们回答：这些证据究竟是谁收集、又是谁拼在了一起。",
      entryChoices: [
        { kind: "action", text: "先查看太初剑的封存状态" },
        { kind: "speech", text: "先问是谁批准搜查住处" },
      ],
    },
    {
      id: "ch03",
      title: "人间一碗面",
      summary: "失去修为以后，你第一次必须靠普通人的劳动和善意活下去。",
      entry: "山门在雨里合拢以后，你沿北境官道走了两日。没有宗籍、灵石和修为，曾经会替你让路的人如今只当你是个淋透的年轻人。矿镇面铺正要打烊，陈伯把一捆湿柴推到檐下：劈完它，能换一碗热面，也能换一个不追问来历的座位。",
      entryChoices: [
        { kind: "action", text: "卷起袖子先把湿柴劈完" },
        { kind: "speech", text: "问陈伯镇上是否还招短工" },
      ],
    },
    {
      id: "ch04",
      title: "残卷照骨",
      summary: "上古残卷让你一夜筑基，矿账却把力量重新连回闻照雪的处境。",
      entry: "旧矿牌嵌进古祠石门时，地下断层亮起一线金光。残卷悬在积水上方，照见你已经破碎的经脉，也照见矿工藏在墙缝里的旧账。它能给你的不是原来的根骨，而是一条必须由你重新选择、重新承受的路。",
      entryChoices: [
        { kind: "action", text: "先核对残卷与旧矿牌的纹路" },
        { kind: "speech", text: "先问陈伯这些矿账从何而来" },
      ],
    },
    {
      id: "ch05",
      title: "与雪同归",
      summary: "你带证人重返十二峰，让旧制回答代价，并拒绝成为下一把更漂亮的椅子。",
      entry: "晨光越过十二峰时，你沿废弃运矿古道重返凌霄宗。陈伯、阿箬和桑迟带着矿账、副印与证词站在你身后；联合听审台上，闻照雪仍被隔在禁制里，裴行舟则准备把所有错误归给一个已经失去价值的下属。这一次，你不是回来请求宗门相信你。",
      entryChoices: [
        { kind: "action", text: "先把完整矿账交到众人面前" },
        { kind: "speech", text: "让矿民先亲口讲完他们的事" },
      ],
    },
  ],
  characters: [
    {
      id: "wen_zhaoxue",
      name: "闻照雪",
      role: "北境剑尊",
      portrait: "/xianxia/immortal-sister/portraits/wen-zhaoxue.png",
      shortBio: "温柔、聪明又有生活趣味的年轻剑尊，也是与你同出一脉的师姐。她习惯拿小事逗你，越担心越说得轻松；希望你拥有自己选择的人生，却总忍不住先替你挡下代价。",
      storyCore: "镇守北境的剑尊，战力极高但受宗门议事规则制约。底线是不让年轻人替旧制度送命。",
      performanceCore: "温柔、有趣、带一点大姐姐式促狭；一本正经地说小事，会记得你的饮食、旧伤和少年糗事。受伤时先照顾别人，不写成冰冷仙子。",
      privateGoal: "查清灵矿与剑冢账目，在不惊动既得利益者的情况下把你留在危险之外。",
      secret: "左臂旧伤与私改矿契的真相都瞒着你：她多年替矿民减债、暗查剑冢账目，说破就会把你卷进宗门清算；被问到伤时惯用玩笑岔开。",
      firstAppearance: "从洗剑池回来，在白日院落里先拿太初剑会不会选你打趣，再用替你试茶温的小动作暴露伤势。",
    },
    {
      id: "pei_xingzhou",
      name: "裴行舟",
      role: "凌霄宗大师兄",
      portrait: "/xianxia/immortal-sister/portraits/pei-xingzhou.png",
      shortBio: "谦和、体面、记性极好。批评别人时像在替对方着想，威胁通常表现为一条更省事的建议；嫉妒你的天赋与闻照雪的偏爱，却从不让嫉妒破坏他的仪态。",
      storyCore: "负责宗门内务与大典秩序，擅长制度、舆论和分配人情。底线是不能失去秩序继承人的位置。",
      performanceCore: "从不在人前失态；每句帮助都留着退路，每次关心都能成为日后的证词。聪明而危险，不为推动剧情降智。",
      privateGoal: "让你在授剑大典前失去资格，同时让所有人相信他已经尽力保护了你。",
      secret: "构陷你的整套安排（复制剑息、副印指令、住处栽赃）绝不能被任何人串起来；他最怕桑迟与名册流向被同时核对，被逼近时会抢先给你更体面的保护。",
      firstAppearance: "亲自带来太初剑台失窃的消息，先替闻照雪按住被风卷起的候选名册，再请所有在场者一同核对时间。",
    },
    {
      id: "sang_chi",
      name: "桑迟",
      role: "礼殿杂务弟子",
      portrait: "/xianxia/immortal-sister/portraits/sang-chi.png",
      shortBio: "负责授剑大典杂务的年轻弟子，消息灵通、胆子普通，最擅长听见秘密，最不擅长承认自己听见过。对你既崇拜又怕被卷进你的麻烦。",
      storyCore: "能接触大典名册、灯房与礼殿杂务，无权进入剑冢。遇到危险先退半步，但不会丢下真的需要帮助的人。",
      performanceCore: "嘴快、容易紧张，会在错误时机说实话；幽默来自求生欲与现场现实的落差。",
      privateGoal: "平安熬过授剑大典，也想证明自己不只是一个传话的人。",
      secret: "错送名册的指令来自裴行舟的副印，他隐约觉得不对却不敢说；心虚让他在两人对峙时话更多、更急着帮你。",
      firstAppearance: "抱着礼单、封金帖和蘸好朱砂的笔在院中忙得团团转，被闻照雪一句话拆穿他早就偷听到了换防风声。",
    },
    {
      id: "chen_bo",
      name: "陈伯",
      role: "山下矿镇面铺老板",
      portrait: "/xianxia/immortal-sister/portraits/chen-bo-v1.png",
      shortBio: "从北境灵矿退下来的老矿工，腿脚不便，嘴上只认工钱，实际总给走投无路的人多添半勺汤。",
      storyCore: "熟悉灵矿劳役、矿账和山下人的生存方式，是旧制度代价的活证人。",
      performanceCore: "少讲大道理，用价钱、天气、伤病和一碗饭判断人；关心别人时总假装是在算账。",
      privateGoal: "保住面铺和身边矿工，也想让多年死伤终于被山上的人看见。",
      secret: "面铺账本底页记着历年矿难死者名单和他没能救下的人；他装作只关心生意，最怕别人翻他的账。",
      firstAppearance: "看见你在雨里饿得站不稳，先问能不能劈柴，再把热面推过来。",
    },
    {
      id: "a_ruo",
      name: "阿箬",
      role: "矿镇采药人",
      portrait: "/xianxia/immortal-sister/portraits/a-ruo-v1.png",
      shortBio: "在矿镇长大的年轻采药人，警惕仙门，却对真正肯干活的人很快亲近。",
      storyCore: "能带你进入废矿与古祠，知道矿工失踪和邪修收取灵税的路线。",
      performanceCore: "说话快，爱拆穿漂亮话；害怕时会先数退路，决定帮忙后反而最敢往前走。",
      privateGoal: "找到失踪的兄长，并让矿镇不再替仙门繁荣支付看不见的代价。",
      secret: "兄长失踪前留给她半枚矿牌，与你行囊里那枚是一对；确认你可信之前她绝不拿出来。",
      firstAppearance: "用药篓挡住你去路，先检查你手上的茧，再决定要不要相信你。",
    },
    {
      id: "lu_kui",
      name: "吕魁",
      role: "盘踞废矿的邪修",
      shortBio: "靠替仙门外围处理脏事收取灵税，欺软怕硬，却很懂如何拿合法文书包装掠夺。",
      storyCore: "掌握废矿入口与部分矿契往来，是裴行舟利益链伸到人间的中间人。",
      performanceCore: "不狂笑、不自报阴谋；先讲规矩和欠账，只有占尽便宜时才露出轻蔑。",
      privateGoal: "守住矿契与古祠秘密，把所有责任推给失去宗籍的散修。",
      secret: "他收的灵税有三成进了自己腰包，副印文书是真的、账目是假的；最怕上面派人对账，被戳穿时会先出卖上线自保。",
      firstAppearance: "带着盖有仙门外务印的收税文书来到面铺，把勒索说成一次例行核验。",
      featured: false,
    },
  ],
  relationships: [
    { id: "r_shen_wen", roles: ["shen_yan", "wen_zhaoxue"], public: "闻照雪是与你同出一脉的师姐，也是在宗门身份之外长期照顾、理解你的人。", tension: "你早已想与她真正并肩；她也在意你，却习惯先用师姐身份替你挡下危险。" },
    { id: "r_shen_pei", roles: ["shen_yan", "pei_xingzhou"], public: "同门师兄弟，裴行舟公开照顾你的宗门生活。", tension: "你的天赋打乱了他多年经营的继承秩序，他要把嫉妒改写成合理程序。" },
    { id: "r_wen_pei", roles: ["wen_zhaoxue", "pei_xingzhou"], public: "同辈剑修与内务主事，公务往来以礼相待。", tension: "她暗查的矿契账目正是他利益链的根；两人都怀疑对方已经知道了什么，当面越客气，话里的试探越锋利。" },
    { id: "r_pei_sang", roles: ["pei_xingzhou", "sang_chi"], public: "上级与跑腿文书，裴行舟平日待他格外宽和。", tension: "桑迟手里经过的名册是构陷链条的一环；裴行舟维持宽和是防他回想细节，桑迟越被优待越觉得不安。" },
    { id: "r_wen_sang", roles: ["wen_zhaoxue", "sang_chi"], public: "师姐与小文书，闻照雪素来护着他。", tension: "桑迟崇拜她也怕她；名册的事他最想先告诉她，却又怕把她拖下水。" },
    { id: "r_chen_a", roles: ["chen_bo", "a_ruo"], public: "面铺老板与常来帮工的矿家女，处得像半个父女。", tension: "陈伯知道她兄长失踪的更多细节却压着不说，怕她一个人去废矿送命；阿箬已经察觉他在瞒。" },
    { id: "r_lu_chen", roles: ["lu_kui", "chen_bo"], public: "收税官与镇上铺户，表面客客气气。", tension: "吕魁的假账需要镇上铺户画押配合，陈伯一直拖着不签；两人都在等对方先露破绽。" },
  ],
  opening: {
    usedMaterialId: "immortal_ch01_s01_m01",
    choices: [
      { kind: "speech", text: "“既然师姐破费下注，那我便押太初，名字就叫‘照雪’。”" },
      { kind: "speech", text: "“灵剑择主随缘即可，我更好奇师姐刚才押了什么结果？”" },
    ],
    events: [
      {
        type: "narration",
        text: "北境天光难得这般透亮。授剑大典前一日的未时，主峰授剑院的露天石坪被白日晒得暖意微泛，几株古松将斑驳碎影拓在青石长案上。明日清晨，沉睡百年的绝世灵剑‘太初’便要在十二峰剑冢前公开择主，作为十二名候选者之一，你正坐在这方院落里歇息，耳边尽是山风穿过回廊的细碎声响。",
      },
      {
        type: "narration",
        text: "院门处一阵脚步声跌跌撞撞地打破了宁静。礼殿杂务弟子桑迟怀里死死抱着厚厚一沓描金剑谱与红木赌签，手里还拎着一支饱蘸朱砂的细毫笔，一路小跑过来，衣角差点带翻石案边的铜洗。他在长案另一头把东西一股脑放下，气喘吁吁地直抹额头的细汗。",
      },
      {
        type: "dialogue",
        person: "sang_chi",
        text: "师兄，总算逮着你了！礼殿和执事堂那帮同门已经为明日开出足足六副盘口，就差你自个儿这张定心签！你给句准话，明日剑冢里那十二柄候选灵剑，你觉着太初当真会挑你么？还有，若真被你领了回来，你打算给它改个什么名字？我可指着押你这一注换下半年的中品灵石呢！",
      },
      {
        type: "narration",
        text: "桑迟的话音还没落，院外青石小径上便传来一声带着笑意的轻咳。刚从洗剑池折返的闻照雪信步迈入院中，她一身素白道袍的袖口尚挽在小臂处，身上还带着洗剑池特有的冷泉水汽，眉眼间却全是松弛惬意的温和。早你十年入门的师姐几步走到石案旁，顺手将一盏刚晾好的热茶挪到你右手边，指尖轻触瓷盏边缘试了试温度。",
      },
      {
        type: "dialogue",
        person: "wen_zhaoxue",
        text: "别听桑迟胡闹。太初那是认主极挑剔的老脾气，你平日练剑总爱在收式时多挽半朵剑花，当年在试剑坪险些把长老的袍角削下一块，它若是真挑了你，怕是头一天就得嫌你手欠。不过——这热茶先喝了，洗剑池边风大，你昨夜练完剑又没穿避寒的坎肩，手腕的旧伤可还发酸？",
      },
      {
        type: "narration",
        text: "闻照雪一边说着，一边极其自然地扯过桑迟手里那张写满人名的红木赌签，拿指节轻轻敲了敲长案，眼底漾开几分大姐姐式的促狭笑意。她没有半点北境剑尊的架子，反倒当着桑迟的面，大大方方地从腰间解下一枚质地温润的青玉佩，‘啪嗒’一声按在桑迟带来的押注簿上。",
      },
      {
        type: "dialogue",
        person: "wen_zhaoxue",
        text: "喏，我也押一份。当年你刚入门那会儿，连拿柄木剑都嫌磨手，如今倒成了宗门上下议论最多的候选人。桑迟问你的话我也好奇，真要是太初选了你，你打算在剑柄上刻个什么正经名号？总不能还像小时候养的那只灵雀一样，叫什么‘飞雪’、‘滚圆’吧？",
      },
      {
        type: "narration",
        text: "阳光透过松针落在石案与赌签上，桑迟两眼放光地抓着朱砂笔眼巴巴瞧着你，闻照雪也微微侧过头，托着腮带着温软的笑意等你的答复。",
      },
    ],
  },
  chapterBackgrounds: {
    ch01: {
      video: "/xianxia/immortal-sister/background-remix-ch01-warm-courtyard-v2.mp4",
      poster: "/xianxia/immortal-sister/background-remix-ch01-warm-courtyard-v2.gif",
      label: "授剑院白日",
    },
    ch02: {
      video: "/xianxia/immortal-sister/background-remix-ch02-red-tribunal-v1.mp4",
      label: "山门问责与废骨听审",
    },
    ch03: {
      video: "/xianxia/immortal-sister/background-vertical-ch03-mortal-noodle-shop-dream-v2.mp4",
      poster: "/xianxia/immortal-sister/background-vertical-ch03-mortal-noodle-shop-dream-v2.gif",
      label: "初入人间的山城面馆",
    },
    ch04: {
      video: "/xianxia/immortal-sister/background-vertical-ch04-scroll-shrine-dream-v2.mp4",
      poster: "/xianxia/immortal-sister/background-vertical-ch04-scroll-shrine-dream-v2.gif",
      label: "人间古祠与意外得到的上古功法",
    },
    ch05: {
      video: "/xianxia/immortal-sister/background-remix-ch05-celestial-gate-v1.mp4",
      label: "重返十二峰听审",
    },
  },
  backgroundMusic: {
    src: "/xianxia/immortal-sister/audio/pingshengyi-theme.mp3",
    title: "平生意",
    queue: [{
      src: "/xianxia/immortal-sister/audio/bishangguan-theme.mp3",
      title: "壁上观",
    }],
  },
  chapterEndPreviews: [
    {
      chapterId: "ch01",
      chapterNumber: 1,
      title: "剑冢失窃",
      summary: "太初剑择主前夜失窃，现场留下与你相同的试剑剑息，而授剑院众人都能证明你没有离开。闻照雪拦住你冒险自证并封存残纹；裴行舟以担保为名接管调查后，失窃灵剑却在你的住处被找到，宗门随即连夜启动听审。",
      nextObjective: "参加连夜听审，在裴行舟把程序变成定罪以前，拆穿试剑残纹和住处搜证之间的矛盾。",
      content: [
        {
          id: "preview-ch01-ending",
          kind: "image",
          src: "/xianxia/immortal-sister/mj-ending-ch01-stolen-sword-v1.jpg",
          alt: "失窃灵剑出现在你的住处，宗门连夜封锁现场",
          caption: "第一章结算 · 失窃灵剑",
        },
        {
          id: "preview-ch01-hud",
          kind: "hud",
          eyebrow: "第一章结束 · 当前状态",
          title: "弟子灵台",
          rows: [
            { label: "修为", value: "未损" },
            { label: "根骨", value: "百年剑胚" },
            { label: "剑心", value: "稳定" },
          { label: "太初剑", value: "失窃 · 出现在住处", tone: "warning" },
          ],
          note: "你拥有完整不在场证明；授剑资格仍被暂时冻结。",
        },
      ],
    },
    {
      chapterId: "ch02",
      chapterNumber: 2,
      title: "山门已关",
      summary: "连夜听审中，复制的试剑残纹、住处搜证与失窃灵剑被拼成完整罪证。闻照雪受到矿契旧案牵制，没能当众说出她真正做过什么；你被废去根骨、逐出宗门，也把她的沉默当成了放弃。",
      nextObjective: "先在人间活下去，再查清闻照雪为何沉默，以及这场栽赃真正保护了谁。",
      content: [
        {
          id: "preview-ch02-ending",
          kind: "image",
          src: "/xianxia/immortal-sister/mj-ending-ch02-root-destroyed-v1.jpg",
          alt: "雨夜听审后，你的根骨被废，山门在身后关闭",
          caption: "第二章结算 · 山门落雨",
        },
        {
          id: "preview-ch02-hud",
          kind: "hud",
          eyebrow: "第二章结束 · 当前状态",
          title: "灵脉诊断",
          rows: [
            { label: "修为", value: "尽失", tone: "warning" },
            { label: "根骨", value: "0%", tone: "warning" },
            { label: "剑心", value: "封锁" },
            { label: "功法", value: "无法运转" },
          ],
          note: "山门将在一炷香后关闭。",
        },
      ],
    },
    {
      chapterId: "ch03",
      chapterNumber: 3,
      title: "人间一碗面",
      summary: "失去修为与宗籍后，你第一次靠搬货、记账和普通人的信任换来住处与热饭。邪修对矿工的欺压让你重新拔剑；一份来自废矿的旧账，则第一次把人间的苦难与凌霄宗的灵石连在一起。",
      nextObjective: "追进废矿古祠，找到旧账指向的上古残卷，并确认闻照雪是否一直在替矿民承担罪责。",
      content: [
        {
          id: "preview-ch03-ending",
          kind: "image",
          src: "/xianxia/immortal-sister/story/ch03-human-noodle-shop-clean-v2.png",
          alt: "雨夜人间面馆里，一碗热面被推到你面前",
          caption: "第三章结算 · 人间烟火",
        },
        {
          id: "preview-ch03-hud",
          kind: "hud",
          eyebrow: "第三章结束 · 当前状态",
          title: "凡身记录",
          rows: [
            { label: "修为", value: "无" },
            { label: "根骨", value: "破损 · 0%", tone: "warning" },
            { label: "体力", value: "46 / 100" },
            { label: "功法", value: "无法运转" },
          ],
          note: "新增记录：这里有人愿意记住你的名字。",
        },
      ],
    },
    {
      chapterId: "ch04",
      chapterNumber: 4,
      title: "残卷照骨",
      summary: "废矿古祠里，上古残卷回应了你破碎的经脉，让你一夜重回筑基。矿账与闻照雪留下的批注同时证明：她并非背叛你，而是因保护你和矿民被宗门软禁。",
      nextObjective: "带上矿账与人间证人重返十二峰，救出闻照雪，并让裴行舟和旧制公开回答代价。",
      content: [
        {
          id: "preview-ch04-ending",
          kind: "image",
          src: "/xianxia/immortal-sister/story/ch04-ancient-scroll-awakens-v1.png",
          alt: "废矿古祠里，上古残卷照亮你破碎的根骨",
          caption: "第四章结算 · 残卷照骨",
        },
        {
          id: "preview-ch04-hud",
          kind: "hud",
          eyebrow: "第四章结束 · 当前状态",
          title: "残卷共鸣",
          rows: [
            { label: "修为", value: "筑基初期 · 0 / 1000" },
            { label: "不灭剑魂", value: "第一重 · 觉醒 3%" },
            { label: "战力", value: "120" },
            { label: "功法", value: "《上古诛仙剑诀》残篇" },
          ],
          note: "异常：被废根骨正在自行重构。",
        },
      ],
    },
    {
      chapterId: "ch05",
      chapterNumber: 5,
      title: "与雪同归",
      summary: "你带着矿账与人间证人重返十二峰，揭开裴行舟的栽赃和仙门繁荣背后的代价。闻照雪终于说出当年的选择；你没有接过掌权者让出的席位，只牵住她的手，一起离开山门。",
      content: [
        {
          id: "preview-ch05-ending",
          kind: "image",
          src: "/xianxia/immortal-sister/story/ch05-return-hearing-v1.png",
          alt: "你带着人间证人与矿账重返十二峰听审",
          caption: "第五章结算 · 与雪同归",
        },
        {
          id: "preview-ch05-hud",
          kind: "hud",
          eyebrow: "第五章结束 · 最终状态",
          title: "剑途新页",
          rows: [
            { label: "修为", value: "剑仙境" },
            { label: "不灭剑魂", value: "完整" },
            { label: "功法", value: "《上古诛仙剑诀》" },
            { label: "道途", value: "自由散仙" },
          ],
          note: "结局不是占有宗门，而是重新选择怎样生活。",
        },
      ],
    },
  ],
  mediaCues: {
    immortal_ch01_s01_m02: [
      {
        id: "immortal-ch01-jade-evidence",
        kind: "image",
        src: "/xianxia/immortal-sister/story/ch01-sword-tomb-residue-v4.png",
        alt: "倒悬残剑遮蔽天光，幽暗剑冢石门的太极阵眼留有淡金剑纹与紫黑药霜",
        caption: "剑冢外阵 · 残纹与候选剑息一致",
      },
      {
        id: "immortal-ch01-status-hud",
        kind: "hud",
        eyebrow: "凌霄宗 · 弟子灵台",
        title: "太初择主前夜",
        rows: [
          { label: "剑道资质", value: "百年剑胚" },
          { label: "太初剑", value: "失窃" },
          { label: "候选次序", value: "十二人之一" },
          { label: "剑冢残纹", value: "与你的试剑剑息一致", tone: "warning" },
        ],
        note: "授剑院众人可证明：残纹出现时，你始终没有离开。",
      },
    ],
    immortal_ch02_s01_m02: [
      {
        id: "immortal-ch02-sealed-original-trace",
        kind: "image",
        src: "/xianxia/immortal-sister/story/ch02-sealed-original-trace-v1.png",
        alt: "听审台上摊开的候选名册、朱砂笔、剑鞘与封存原始剑纹的透明玉匣",
        caption: "封存原纹 · 剑息可以复制，完整灵息不能",
      },
    ],
    immortal_ch02_s02_m03: [
      {
        id: "immortal-ch02-root-broken-hud",
        kind: "hud",
        eyebrow: "惩戒后 · 灵脉诊断",
        title: "山门落雨",
        rows: [
          { label: "修为", value: "尽失", tone: "warning" },
          { label: "根骨", value: "已毁 · 0%", tone: "warning" },
          { label: "剑心", value: "封锁" },
          { label: "宗籍", value: "除名", tone: "warning" },
        ],
        note: "处置：逐往人间。山门将在一炷香后关闭。",
      },
    ],
    immortal_ch03_s01_m01: [
      {
        id: "immortal-ch03-mortal-overlook",
        kind: "image",
        src: "/xianxia/immortal-sister/story/ch03-mortal-overlook-v1.png",
        alt: "失去修为后，你第一次从山脊望见真正的人间聚落",
        caption: "初到人间 · 云下的人并不等仙门批准才生活",
      },
    ],
    immortal_ch03_s01_m02: [
      {
        id: "immortal-ch03-noodle-shop",
        kind: "image",
        src: "/xianxia/immortal-sister/story/ch03-human-noodle-shop-clean-v2.png",
        alt: "雨夜人间面馆里，老板把一碗热面递到你手中",
        caption: "人间烟火 · 有人给你的面里多放了一枚蛋",
      },
    ],
    immortal_ch03_s01_m03: [
      {
        id: "immortal-ch03-mortal-life-hud",
        kind: "hud",
        eyebrow: "人间 · 生存记录",
        title: "一碗面",
        rows: [
          { label: "修为", value: "无" },
          { label: "体力", value: "46 / 100" },
          { label: "铜钱", value: "三十七枚" },
          { label: "今日工钱", value: "一碗热面" },
        ],
        note: "新增记录：这里有人愿意记住你的名字。",
      },
    ],
    immortal_ch04_s01_m01: [
      {
        id: "immortal-ch04-hidden-tablet",
        kind: "image",
        src: "/xianxia/immortal-sister/story/ch04-hidden-tablet-v1.png",
        alt: "你在废矿古祠的石板下发现被藏起的残卷入口",
        caption: "废矿古祠 · 被人藏起来的东西仍在发光",
      },
    ],
    immortal_ch04_s01_m02: [
      {
        id: "immortal-ch04-scroll-awakens",
        kind: "image",
        src: "/xianxia/immortal-sister/story/ch04-ancient-scroll-awakens-v1.png",
        alt: "废矿古祠里，上古残卷照亮破碎的根骨",
        caption: "残卷照骨 · 被废去的经脉开始重新发亮",
      },
      {
        id: "immortal-ch04-cultivation-hud",
        kind: "hud",
        eyebrow: "上古残卷 · 共鸣记录",
        title: "残卷照骨",
        rows: [
          { label: "修为", value: "筑基初期 · 0 / 1000" },
          { label: "不灭剑魂", value: "第一重 · 觉醒 3%" },
          { label: "战力", value: "120" },
          { label: "功法", value: "《上古诛仙剑诀》残篇" },
        ],
        note: "异常：被废根骨正在自行重构。",
      },
    ],
    immortal_ch05_s01_m01: [
      {
        id: "immortal-ch05-return-hearing",
        kind: "image",
        src: "/xianxia/immortal-sister/story/ch05-return-hearing-v1.png",
        alt: "你带着人间证人与矿账重返十二峰听审",
        caption: "重返仙门 · 这一次轮到十二峰回答",
      },
    ],
  },
  segments: [
    {
      id: "immortal_ch01_s01",
      chapterId: "ch01",
      location: "凌霄宗主峰授剑院",
      present: ["wen_zhaoxue", "sang_chi", "pei_xingzhou"],
      goal: "建立太初公开择主前的亲近日常；失窃消息到来后，让你决定先固定不在场人证还是随执事核对原始残纹，不把你写成主动开启剑冢的人。",
      focusRelationships: ["r_shen_wen"],
      pressure: "授剑大典让每个人都必须维持宗门体面；任何异常一旦公开，都会先伤害最接近权力的人。",
      materials: [
        { id: "immortal_ch01_s01_m01", content: "明日，剑冢将让十二柄候选灵剑自行择主，你只是十二名候选者之一。桑迟抱来候选剑谱与赌签，催大家猜哪柄剑会选中你，以及真被选中后你想给它改什么名字；这只是授剑前的轻松日常，不发生警报，不谈调查。闻照雪以亲近师姐身份陪你下注、拿旧事打趣，也认真听你想要什么。" },
        { id: "immortal_ch01_s01_m02", content: "玩家回应赌哪柄剑或想取什么名字后，裴行舟才第一次进入授剑院，带来绝世灵剑太初在公开择主前夜失窃的消息。剑冢外阵留下与你候选试剑牌中相同的剑息残纹；残纹只能证明剑息被使用，不能证明使用者是你，而闻照雪、桑迟和院中杂役都能证明你当时未离开授剑院。" },
        { id: "immortal_ch01_s01_m03", content: "裴行舟承认不在场证明成立，却暗示只有与你亲近且有权限的闻照雪可能取得完整试剑剑息，借机把你们的私人亲近包装成共同嫌疑。" },
      ],
      exit: "不在场人证得到记录，众人转向核对剑冢原始阵纹与试剑牌之间的矛盾。",
    },
    {
      id: "immortal_ch01_s02",
      chapterId: "ch01",
      location: "剑冢外阵与守夜廊",
      present: ["wen_zhaoxue", "pei_xingzhou", "sang_chi"],
      goal: "让你选择怎样自证；闻照雪阻止会毁掉证据或伤及你的冒险验证，裴行舟则用体面的担保取得调查控制权。",
      focusRelationships: ["r_shen_wen", "r_shen_pei"],
      pressure: "宗门更需要明日的大典照常举行，而不是今夜得到一个难看的真相。",
      materials: [
        { id: "immortal_ch01_s02_m01", content: "你可以提出以神识重走外阵来证明残纹是复制品；闻照雪立即拦下，因为重走会抹去原始残纹并可能反噬剑心，她坚持先封存现场，再用人证和阵眼副本自证。" },
        { id: "immortal_ch01_s02_m02", content: "裴行舟以大师兄身份公开为你担保，承诺听审前不拘禁你，并借此接过封存物、值守名册和住处搜查的全部调查权限；他同时把闻照雪列为关系人，要求她回避。" },
        { id: "immortal_ch01_s02_m03", content: "调查尚未结束，失窃的太初剑便在你的住处被找到；搜查由裴行舟的人执行，时间、残纹和物证被迅速拼成罪证，宗门连夜启动听审。" },
      ],
      exit: "你从被庆典需要的天才变成必须证明自己没有犯罪的人。",
    },
    {
      id: "immortal_ch02_s01",
      chapterId: "ch02",
      location: "凌霄宗戒律殿听审台",
      present: ["wen_zhaoxue", "pei_xingzhou", "sang_chi"],
      goal: "让你亲自参与听审、拆解证据与选择信任对象；闻照雪努力保护你，却因矿契旧案无法公开全部真相。",
      focusRelationships: ["r_shen_wen", "r_shen_pei"],
      pressure: "十二峰需要在天亮前给授剑大典一个体面答案，程序越完整，留给人的余地越少。",
      materials: [
        { id: "immortal_ch02_s01_m01", content: "听审依次展示复制的试剑残纹、裴行舟主持的住处搜证与太初剑；你可以逐项质询，但裴行舟把每一次程序让步都包装成对你的保护。" },
        { id: "immortal_ch02_s01_m02", content: "闻照雪拿出封存的原始残纹，证明有人复制了剑息却无法复制你的完整灵息；戒律席随即以她私改北境矿契为由要求她避嫌，她不能公开矿民名单。" },
        { id: "immortal_ch02_s01_m03", content: "桑迟承认错送名册的指令来自裴行舟的副印，却因原始传讯符已被销毁而无法形成完整证据；听审从查真相转向决定由谁承担风险。" },
      ],
      exit: "听审认定你无法自证，闻照雪要求以自己的剑尊席位换取延期，却被一并限制行动。",
    },
    {
      id: "immortal_ch02_s02",
      chapterId: "ch02",
      location: "凌霄宗山门惩戒台与下山石阶",
      present: ["wen_zhaoxue", "pei_xingzhou", "sang_chi"],
      goal: "完成废骨与逐出山门，让你的误会来自亲眼所见而非作者说明，同时保留闻照雪仍在行动的证据。",
      focusRelationships: ["r_shen_wen", "r_shen_pei"],
      pressure: "宗门把牺牲一个弟子称作维持秩序；任何公开反抗都会让闻照雪与矿民一起被追加问罪。",
      materials: [
        { id: "immortal_ch02_s02_m01", content: "惩戒阵封住你的经脉并废去根骨；闻照雪强行踏入阵线替你挡下一部分剑意，自己也被戒律锁链困在台上。" },
        { id: "immortal_ch02_s02_m02", content: "你隔着禁制追问闻照雪，她只能要求你先活下去，不能说出矿契与证人的位置；这句保护在此刻听来更像默认罪名。" },
        { id: "immortal_ch02_s02_m03", content: "宗籍被除、山门将闭，桑迟冒险把一枚没有署名的旧矿牌塞进你的行囊；闻照雪被带回十二峰软禁，你独自被送下人间。" },
      ],
      exit: "山门在雨里关闭，你失去修为与宗籍，带着对闻照雪的误会和那枚旧矿牌进入人间。",
    },
    {
      id: "immortal_ch03_s01",
      chapterId: "ch03",
      location: "北境矿镇雨巷与陈伯面铺",
      present: ["chen_bo", "a_ruo", "lu_kui"],
      goal: "让你以凡人身份靠劳动与关系重新获得立足处，并从普通人的生活看见仙门资源制度的真实代价。",
      focusRelationships: [],
      pressure: "没有宗籍的人不能合法修行，矿镇却每天把灵石送上山；这里的人只相信能一起扛活、一起承担后果的人。",
      materials: [
        { id: "immortal_ch03_s01_m01", content: "陈伯没有追问你的仙门过去，只让你劈柴、记账换一碗热面；阿箬从你手上的剑茧认出你受过训练，却替你保留沉默。" },
        { id: "immortal_ch03_s01_m02", content: "矿工谈起灵税、伤病和被除名者：山上每多点亮一座阵，山下就有人多下一次废矿；你第一次知道旧矿牌属于一座已被注销的矿。" },
        { id: "immortal_ch03_s01_m03", content: "吕魁带着盖有仙门外务印的文书来收灵税，并以无宗籍修行为由盯上你；他身上的副印纹路与裴行舟的听审文书同源。" },
      ],
      exit: "你不再只想熬过今晚，决定和矿镇的人一起查清废矿、旧矿牌与外务副印的联系。",
    },
    {
      id: "immortal_ch03_s02",
      chapterId: "ch03",
      location: "北境废矿与封闭古祠外廊",
      present: ["chen_bo", "a_ruo", "lu_kui"],
      goal: "让失去修为的你依靠观察、劳作经验和同伴协作对抗邪修，找到通往残卷与真相的入口。",
      focusRelationships: [],
      pressure: "吕魁拥有修为和合法文书，你拥有的只是矿工愿不愿意站出来，以及自己是否还敢相信别人。",
      materials: [
        { id: "immortal_ch03_s02_m01", content: "你利用矿井旧支架、药粉与排水沟反制吕魁的追捕，没有恢复修为也没有凭空碾压；阿箬与陈伯按你的安排完成关键协作。" },
        { id: "immortal_ch03_s02_m02", content: "吕魁留下的账册记录灵石经外务堂转入剑冢，其中夹着闻照雪多次要求停止征收的批注；她被指控的私改矿契实际是在替矿民减债。" },
        { id: "immortal_ch03_s02_m03", content: "旧矿牌打开废矿深处的封闭古祠，祠内残卷对你破碎的根骨产生微弱回应；矿工愿意替你保存账册并等待你的下一步。" },
      ],
      exit: "你找到上古残卷与闻照雪留下的证据，必须决定是否重新踏上修行之路。",
    },
    {
      id: "immortal_ch04_s01",
      chapterId: "ch04",
      location: "废矿古祠与地下灵脉断层",
      present: ["chen_bo", "a_ruo", "lu_kui"],
      goal: "让力量回归成为一次有代价的选择，而不是无条件爽点；残卷回应你在人间形成的新判断。",
      focusRelationships: [],
      pressure: "残卷可以重构根骨，也可能把你重新变成只相信力量的人；吕魁仍试图夺走账册与古祠。",
      materials: [
        { id: "immortal_ch04_s01_m01", content: "残卷要求你以破碎经脉承受第一次共鸣；阿箬守住入口，陈伯用矿工记号帮你找到灵脉真正的断点。" },
        { id: "immortal_ch04_s01_m02", content: "残卷不是替你恢复旧根骨，而是沿着你在人间重新建立的选择重构经脉；不灭剑魂第一重觉醒，修为开始回流。" },
        { id: "immortal_ch04_s01_m03", content: "你一夜筑基并击退吕魁，却没有杀死或替同伴决定后果；完整矿账与外务副印成为可以带回仙门的证据。" },
      ],
      exit: "力量重新回来，但你已经不是只为证明天赋而执剑的人。",
    },
    {
      id: "immortal_ch04_s02",
      chapterId: "ch04",
      location: "矿镇面铺后院与上山古道",
      present: ["sang_chi", "chen_bo", "a_ruo"],
      goal: "揭开闻照雪被软禁的真相，组织证人与证据，让返回仙门成为你与同伴共同作出的行动。",
      focusRelationships: ["r_shen_wen"],
      pressure: "十二峰将在三日内销毁旧矿契；上山意味着矿民公开身份，也意味着你必须承担他们选择相信你的风险。",
      materials: [
        { id: "immortal_ch04_s02_m01", content: "桑迟逃下山带来闻照雪被软禁的消息：她在听审前已查到裴行舟副印，却为保护矿民姓名拒绝交出完整矿册。" },
        { id: "immortal_ch04_s02_m02", content: "闻照雪留下的短笺没有要求你复仇，只写明证据位置并让你自行选择人生；你终于确认她的沉默不是放弃。" },
        { id: "immortal_ch04_s02_m03", content: "陈伯与阿箬决定携矿账同行，其他矿工提供证词与副本；你们避开正门，沿废弃运矿古道重返十二峰。" },
      ],
      exit: "你带着力量、证据和愿意亲自开口的人返回仙门，目标是救出闻照雪并公开改写规则。",
    },
    {
      id: "immortal_ch05_s01",
      chapterId: "ch05",
      location: "凌霄宗十二峰联合听审台",
      present: ["wen_zhaoxue", "pei_xingzhou", "sang_chi", "chen_bo", "a_ruo"],
      goal: "让你通过证据、证人和当场选择夺回叙事权，而非只靠修为碾压；让裴行舟保持聪明并逐步失去退路。",
      focusRelationships: ["r_shen_wen", "r_shen_pei"],
      pressure: "十二峰愿意惩罚一个坏人，却未必愿意承认整套分配制度依靠山下人的损失维持。",
      materials: [
        { id: "immortal_ch05_s01_m01", content: "你带陈伯、阿箬、矿账与副印重返听审台；闻照雪仍被禁制隔离，但第一次看见你不是独自回来。" },
        { id: "immortal_ch05_s01_m02", content: "裴行舟承认副印属于外务堂，却试图把吕魁定义为个人越权；矿工证词、转账路径与桑迟保存的名册迫使他解释为何每次错误都只对他有利。" },
        { id: "immortal_ch05_s01_m03", content: "裴行舟栽赃、转移灵石与操纵听审的证据公开；他失去继承席位，但听审席仍试图用惩罚个人来保住旧制度。" },
      ],
      exit: "裴行舟的罪被揭开，真正的问题转为谁来决定仙门与人间今后的关系。",
    },
    {
      id: "immortal_ch05_s02",
      chapterId: "ch05",
      location: "听审台外的晨光长阶",
      present: ["wen_zhaoxue", "pei_xingzhou", "sang_chi", "chen_bo", "a_ruo"],
      goal: "让闻照雪、矿民与宗门分别表达未来诉求，最后选择权归还玩家，并忠实演绎玩家明确作出的终局选择。",
      focusRelationships: ["r_shen_wen"],
      pressure: "打倒裴行舟不等于新秩序自动出现；接过席位可以立即改变制度，离开则拒绝让亲密关系再次成为权力工具。",
      materials: [
        { id: "immortal_ch05_s02_m01", content: "闻照雪获释并亲口解释当年沉默：她选择先保住矿民名单与活着的你，却承认替你决定一切也伤害了你。" },
        { id: "immortal_ch05_s02_m02", content: "陈伯要求矿民拥有矿契表决权，桑迟希望宗籍不再决定修行资格；长老席邀请你接过空出的席位，闻照雪不替你选择。" },
        { id: "immortal_ch05_s02_m03", content: "最终抉择被明确交还给你：接过席位留在仙门改革，或拒绝权位带闻照雪离开。所有NPC必须停下来等待玩家明确选择，不能代替玩家决定。" },
        { id: "immortal_ch05_s02_m04", content: "忠实执行玩家上一轮已经明确作出的终局选择并演出直接后果；若玩家仍未选择，则继续让人物回应与澄清，绝不能擅自完成故事。" },
      ],
      exit: "你的明确选择得到执行，仙门与闻照雪的未来由此确定，故事完成。",
    },
  ],
  styleProfile: ensembleTableauXianxiaStyle,
};

const steadyDao: XianxiaStory = {
  id: "steady-dao",
  title: "稳字经",
  subtitle: "李长寿篇",
  logline: "一个只想平安活完寿元的炼气士，先处理了一名走错阵的探子，后来却不得不替整个洪荒重新计算活路。",
  accent: "#a9ccef",
  playerRole: {
    id: "li_changshou",
    name: "李长寿",
    displayRole: "小琼峰大师兄",
    fixedCore: "你是地球绝症患者转世，在小琼峰低调修行三十三年。你精通炼丹、阵法、纸人、毒术与信息差，暗中掌握八百座护峰阵法。",
    baselineTendency: "过去的你以惜命、周全和不轻易暴露底牌闻名；这只是可供玩家采用或反向选择的表演底色，不代表本轮一定谨慎、藏话、装糊涂或另有算计。",
    freeAgency: "你可以决定何时隐藏、何时布局、是否让身边人参与风险，以及最终把稳健理解为独自控制还是共同承担。",
  },
  introduction: {
    time: "封神大劫前夕，诸圣尚未公开落子",
    place: "东胜神洲，度仙门小琼峰",
    world: "洪荒表面仍讲清修、机缘与师承，天庭、大教和仙门却已经开始重新计算香火、气运与因果。没有人公开宣布大劫开始，近来各峰收到的历练名册、外务符牒和凡间祈文却频频错位；有些只是官署忙乱，有些则像有人在用最寻常的差事丈量每个人的软肋。度仙门并非洪荒大宗，只占着几条尚能吐纳的灵脉，门内弟子大多相信灾祸离自己还远。小琼峰尤其不起眼：山不高、弟子少，峰主齐源精于草药却不擅经营，真正把这座山变得难以靠近的，是你三十三年间埋下的丹炉、纸人、毒障和八百座彼此套叠的微光阵法。",
    situation: "你是小琼峰大师兄，曾因死过一次而在宗门留下惜命、周全的名声。明面上，你修为普通，日常负责炼丹、教导师妹蓝灵娥和替师父收拾峰内账目；暗地里，你掌握整座山的阵眼与撤离方案。过去怎样行事不限制你今天怎样选择。今日原本只有两件小事：蓝灵娥想少抄几遍《稳字经》，酒玖想让你替她藏下一坛不该出现的酒。就在茶还温着时，西崖第一层迷阵被人越过。来者没有能力触及真正的杀阵，这次麻烦本身并不难解决；值得计算的是，他为什么带着一枚真实的度仙门外务符，又为什么恰好知道小琼峰最安全的公开路径。",
    objective: "先用最小动静控制闯阵者，别让一次低水平试探搅乱小琼峰的日常；再判断泄露路径的是粗心、贪财还是一条正在伸进宗门的因果线。过程中，你还得决定要把多少真相告诉蓝灵娥——她已经不满足于只享受你的保护。",
  },
  threeAct: [
    "一次针对小琼峰的试探迫使你从被动躲避转为主动构建安全域，同时让蓝灵娥开始追问自己是否有权知道风险。",
    "封神压力渗入宗门与三界，你以纸人和身份差周旋各方；每一次更周全的布局，都让你离清静更远。",
    "你以均衡道开启大道之庭，换众生共同裁决规则；你失去成圣道路，却保住所有人仍能选择怎样活着的余地。",
  ],
  chapters: [
    { id: "ch01", title: "小琼峰今日无事", summary: "西崖探子很快落网；真正留下的是一枚来自宗门内部的外务符，以及蓝灵娥第一次不肯被你支开的眼神。" },
    {
      id: "ch02",
      title: "九成八之外",
      summary: "一份被改过的历练名册把蓝灵娥送向伏击。你能保她平安，却不能继续替她决定是否知情。",
      entry: "次日清晨，西崖的困阵已经恢复原样。从闯阵者身上取下的外务符封在药房案上，符角还沾着西崖的灰白石屑。小琼峰重新有了茶香和扫地声，仿佛麻烦确实只来过一夜。蓝灵娥却带回一份新历练名册：她被临时补进乌龙谷采药队，路线恰好经过外务符所指的废弃山神庙。她把名册压在你的丹炉旁，没有问能不能不去，只问这次你准备告诉她多少。",
      entryChoices: [
        { kind: "action", text: "把新旧路线图都铺开核对" },
        { kind: "speech", text: "先问她自己究竟想不想去" },
      ],
    },
    {
      id: "ch03",
      title: "纸人入局",
      summary: "你用不存在的身份截住一场伏击，也让一个本不存在的人进入天庭与龙宫的账册。",
      entry: "乌龙谷的伏击没有等到真正的采药队，只等到三个会吵架、会装死、被拆开后还能自己爬回来的纸人。活口供出的买家没有姓名，只有一张来自东海水路的香火兑票。回峰后，你刚把纸人烧到第四遍，天庭便派来一名小吏，客气地询问‘海神长庚’为何连续三次干预凡间水路。这个名字原本只是你写在假符上的落款，如今却已经有了官署档案、两份功德和一笔待领取的俸禄。",
      entryChoices: [
        { kind: "speech", text: "先问这份俸禄究竟是谁批的" },
        { kind: "action", text: "让纸人长庚出面接下文书" },
      ],
    },
    {
      id: "ch04",
      title: "大劫没有旁观席",
      summary: "长庚的布局救了许多人，也把身边人留在解释之外；蓝灵娥和酒玖要求共同选择下一次风险。",
      entry: "几年后，‘长庚’已经在天庭账册里升了三次职，你本人仍在小琼峰上以炼气弟子的身份晒药。这样的安排本来很稳，直到同一天送来三封信：天庭要长庚调停两教冲突，度仙门要求你交出护峰阵图，蓝灵娥则把一只被雷劈焦的纸人放到石桌上。她没有拆穿你，只说这只纸人替她挡了一劫，而她甚至不知道自己什么时候被放进了你的计划。酒玖抱着酒坛坐在一旁，难得没有替任何人打圆场。",
      entryChoices: [
        { kind: "speech", text: "把能说的布局从头告诉她们" },
        { kind: "action", text: "先查清是谁逼近小琼峰" },
      ],
    },
    {
      id: "ch05",
      title: "大道之庭",
      summary: "你以均衡道迫使高高在上的秩序接受共同裁决，失去成圣之路，却把选择留给仍要生活的人。",
      entry: "封神榜落定之前，诸圣留下的规则已经开始自行吞噬凡间与仙门。你站在大道之庭尚未闭合的门槛上，身后是蓝灵娥、酒玖、齐源与无数被写进账册却从未被问过的人，面前则是代表旧秩序的道祖鸿钧。你有九成八把握保住自己，也有一条胜算不足两成的路，可以让所有人第一次共同审视这些规则。蓝灵娥把那册只抄了三行的《稳字经》塞回你手里，说最后一条该由你亲自补。",
      entryChoices: [
        { kind: "action", text: "以均衡道开启大道之庭" },
        { kind: "speech", text: "先逼鸿钧说清规则的代价" },
      ],
    },
  ],
  characters: [
    {
      id: "lan_linge",
      name: "蓝灵娥",
      role: "小琼峰师妹",
      shortBio: "二十三岁的年轻炼气士，明快、机灵又有点好胜。她敬重你，也不愿永远被当成需要藏起来的人；依赖你的周全，也在意你是否把她当作真正的同行者。",
      portrait: "/xianxia/steady-dao/portraits/lan-linge.png",
      featured: true,
      storyCore: "具备基础御剑与外出历练能力，不知道你的真实修为和全部底牌。底线是不拿同门性命证明自己。",
      performanceCore: "说话轻快，会撒娇也会反问；紧张时嘴更快，受保护时既安心又不服气。不会只作为被救对象。",
      privateGoal: "免掉眼前罚抄，更长远地想让你把她当成可以知情参与的人。",
      secret: "她早就注意到小琼峰的护山阵纹会自己生长，猜到你藏了实力却装不知道；她在等你亲口告诉她，而不是被瞒到最后。",
      firstAppearance: "趴在石桌另一端抄《稳字经》，见戒尺转动便藏纸，三句话内让人知道她怕罚、亲近你，也敢跟你讨价还价。",
    },
    {
      id: "jiu_jiu",
      name: "酒玖",
      role: "破天峰小师叔",
      shortBio: "二十九岁的外务高手，按宗门辈分是你的小师叔。酒气比人先到，脸皮厚、消息灵、临场反应快；习惯把棘手问题塞进玩笑里，却并非真的不在乎危险。",
      portrait: "/xianxia/steady-dao/portraits/jiu-jiu.png",
      featured: true,
      storyCore: "修为与外务经验都高于小琼峰明面水平，能接触宗门消息，但不知道你的阵法规模与真实修为。",
      performanceCore: "豪爽、不端着长辈架子，理亏时尤其镇定；说话有生活气，不满口玄言。",
      privateGoal: "躲开掌门追酒，也想确认最近出现在度仙门附近的陌生气息究竟冲谁而来。",
      secret: "她这次上山不只是躲酒：外务殿丢了一份关于小琼峰灵脉的旧档，她怀疑有人在打这座峰的主意，没证据前不想吓到任何人。",
      firstAppearance: "酒气先翻过墙，人落地后假装没有踉跄，坐下前已经把酒碗从袖子里取了出来。",
    },
    {
      id: "qi_yuan",
      name: "齐源",
      role: "小琼峰峰主",
      portrait: "/xianxia/steady-dao/portraits/qi-yuan.png",
      featured: true,
      shortBio: "修为和山门地位都不显眼的宽厚师父，遇公文头疼，遇弟子出事却会站稳。他知道你远比表面可靠，只没想到可靠已经发展成八百座阵法。",
      storyCore: "能决定峰内分工，无权推翻外务殿正式命令；底线是保住两个弟子和小琼峰。",
      performanceCore: "宽厚、怕麻烦，常用吃饭和药草化解门规压力；真正生气时不喊口号，只做具体决定。",
      privateGoal: "不让小琼峰因公开抗命被宗门盯上，也不愿弟子替自己的软弱付账。",
      secret: "他年轻时替宗门背过一次黑锅才被发配小琼峰；旧事他从不提，却因此格外见不得弟子被程序碾过。",
      firstAppearance: "提着漏水药壶回来，先问众人吃没吃饭，再发现自己的院子已经进入战备。",
    },
    {
      id: "tian_ting_clerk",
      name: "木公小吏",
      role: "天庭文书官",
      portrait: "/xianxia/steady-dao/portraits/heavenly-clerk.png",
      featured: true,
      shortBio: "一个认真到近乎荒谬的基层仙官，坚信三界所有异常最终都能找到正确表格。胆子不大，却会为了账目对上而顶住上级。",
      storyCore: "掌握长庚身份的公开官署记录，不知道长庚是你的纸人。底线是不篡改已经入档的功德。",
      performanceCore: "说话礼貌、具体，紧张时会反复核对印章；笑点来自他对混乱现实仍保持文书信仰。",
      privateGoal: "找到真正的长庚签完积压文书，免得自己再替一个不存在的人值夜。",
      secret: "他其实已发现长庚的笔迹与小琼峰某位弟子高度相似，但账目对得上，他就选择不写进呈报——这是他文书生涯唯一一次装糊涂。",
      firstAppearance: "抱着比自己上身还高的文书落在小琼峰，先整理歪掉的官帽，再问这里谁叫长庚。",
    },
    {
      id: "hongjun",
      name: "鸿钧",
      role: "道祖与旧秩序化身",
      portrait: "/xianxia/steady-dao/portraits/hongjun.png",
      featured: true,
      shortBio: "不靠怒吼维持权威的人。他把天地稳定看得高于个体得失，相信牺牲少数是避免更大崩塌的唯一理性。",
      storyCore: "知道大劫规则与均衡道的代价，不知道你最终愿意放弃多少。底线是不能允许天地规则完全失控。",
      performanceCore: "语气平静、精确，能承认局部痛苦却拒绝因此否定整体秩序；不得写成只会威胁的空洞反派。",
      privateGoal: "让你接手维护旧秩序，证明任何反抗者最终都必须坐上同一把椅子。",
      secret: "大道之庭并非他所建，他自己也是接任者；那把椅子上坐过别人，这是他绝不主动透露的事。",
      firstAppearance: "大道之庭尽头先出现一道没有影子的座椅，随后才有人开口，像天地规则终于决定亲自解释自己。",
    },
  ],
  relationships: [
    { id: "r_li_lan", roles: ["li_changshou", "lan_linge"], public: "你与二十三岁的蓝灵娥是相处多年的成年师兄妹，你长期负责她的修行与安全；日常亲近到一眼就能看出对方有没有撒谎。", tension: "保护给她安全，也可能剥夺她知情并选择风险的权利；熟稔正在缓慢长成心动，但双方都还没有替彼此下结论。" },
    { id: "r_li_jiu", roles: ["li_changshou", "jiu_jiu"], public: "二十九岁的酒玖常来小琼峰蹭酒、托事，知道你办事稳妥，也习惯拿你的过度谨慎开玩笑。", tension: "她愿意相信你的谨慎，也偶尔故意靠近试探你会不会慌；默认不越过清晰边界，不替蓝灵娥的主情感线抢戏。" },
    { id: "r_lan_jiu", roles: ["lan_linge", "jiu_jiu"], public: "小师叔与小师妹，斗嘴多年、感情不坏。", tension: "酒玖爱拿你打趣逗蓝灵娥脸红；蓝灵娥嘴上嫌弃，私下一直偷偷跟这位小师叔学在外面办事的门道。" },
    { id: "r_qi_lan", roles: ["qi_yuan", "lan_linge"], public: "师父与小弟子，日常互相包庇躲文书。", tension: "齐源总觉得亏欠她一个更有出息的师门，处处多护半分；蓝灵娥却更想让师父看到她能自己扛事。" },
    { id: "r_qi_jiu", roles: ["qi_yuan", "jiu_jiu"], public: "峰主与常来蹭酒的外务高手，彼此欠着数不清的小人情。", tension: "酒玖看得出齐源在替弟子挡事却装糊涂；齐源猜得到她上山另有目的，两人都不先开口。" },
  ],
  opening: {
    usedMaterialId: "steady_ch01_s01_m01",
    choices: [
      { kind: "action", text: "指尖暗扣阵诀，将闯入者锁在西崖" },
      { kind: "speech", text: "灵娥收好字，随我去西崖看看" },
    ],
    events: [
      {
        type: "narration",
        text: `午后的阳光透过矮竹筛在草屋前庭的青石案上，晒得案角的几卷粗纸泛着微温的草木香。二十三岁的师妹蓝灵娥正趴在石案另一端，两只乌溜溜的眼睛隔着一摞写满《稳字经》的黄麻纸觑着你。你指尖刚碰上戒尺，她便眼疾手快地用宽大袖口把最上面那张墨迹未干的纸页盖住，发梢随着动作轻轻蹭过你搁在案沿的手背。`,
      },
      {
        type: "dialogue",
        person: "lan_linge",
        text: `师兄，第三十五遍和第三十六遍其实只差了七个字，而且今天外务殿送来的灵墨太糙，磨得我手腕都酸了……你看，这道红印是不是得休养两炷香？`,
      },
      {
        type: "narration",
        text: `她把纤细的手腕递到你眼皮底下晃了晃，嘴角噙着藏不住的机灵笑意。还没等你的戒尺落下去，一股浓郁醇厚的清洌酒香先翻过了前庭矮墙。二十九岁的小师叔酒玖踏着一双旧草鞋轻巧落地，脚底下假装没有丝毫踉跄，宽袖一抖，两只粗陶酒碗与一坛贴着破天峰封条的灵酒便稳稳落在了石案正中。`,
      },
      {
        type: "dialogue",
        person: "jiu_jiu",
        text: `长寿，别为难灵娥了。来，帮师叔把这坛“醉仙颜”塞进你那药窖最底层，掌门师兄查得紧，整座度仙门也就你这小琼峰最像个清修地界。`,
      },
      {
        type: "dialogue",
        person: "lan_linge",
        text: `师叔又拿陈年灵酒贿赂师兄！上次外务殿来核账，师兄替你顶了三坛“损耗”，害我平白多洗了半个月的灵药碾子。`,
      },
      {
        type: "dialogue",
        person: "jiu_jiu",
        text: `小丫头懂什么，下个月破天峰分发百炼精金，我多给你拨三斤打飞剑。长寿，茶先放放，把你后山那套温酒的泥炉子起开？`,
      },
      {
        type: "narration",
        text: `酒玖自顾自拉过竹凳坐下，顺手将灵娥面前的一碟桂花糕顺走大半。蓝灵娥鼓了鼓腮帮子，悄悄把身子朝你的方向挪了半寸，指尖拽住你的衣角轻轻晃动，眼神里满是“你若帮她藏酒就必须免我抄书”的狡黠与试探。`,
      },
      {
        type: "narration",
        text: `清风拂过庭前药草，石案下由你亲手布设的地脉灵引却在此时毫无征兆地轻颤了一下。三十三年间你在小琼峰周遭埋下了八百座微光阵法，而此刻，西崖最外层那座伪装成天然石林的低阶迷阵，被一股极其微弱的气息精准越过。来人修为低微，却怀揣着度仙门正规的外务符牒，正沿着小琼峰明面上唯一的公开山径摸索上来。灵娥与酒玖对此毫无察觉，仍在为你手里的茶盏与桂花糕斗嘴。`,
      },
      {
        type: "narration",
        text: `这次触碰极其轻微，甚至够不上一次正式的刺探。只要你指诀微动，埋在西崖的三具替身纸人与最低一级的“陷空阵”就能在三息之内把人无声无息地捆在石缝里；但若是任由他再往前走两步，或许能看清究竟是哪个不长眼的同门走漏了路线。`,
      },
      {
        type: "dialogue",
        person: "lan_linge",
        text: `师兄？你手里的茶都凉了……是不是又要借口去巡视后山药圃来躲我的差事？`,
      },
    ],
  },
  initialHud: {
    id: "steady-initial-hud",
    kind: "hud",
    compact: true,
    eyebrow: "稳字经 · 初始状态",
    title: "道心略涣散",
    rows: [
      { label: "稳健", value: "12/100" },
      { label: "酒玖好感", value: "5/100" },
      { label: "灵娥心动", value: "6/100" },
      { label: "修为", value: "8/100" },
    ],
  },
  chapterBackgrounds: {
    ch01: {
      video: "/xianxia/steady-dao/backgrounds/ch01-courtyard-hd.mp4",
      poster: "/xianxia/steady-dao/backgrounds/ch01-courtyard-hd.jpg",
      label: "小琼峰云台上的三人日常",
      tone: { top: "#e9f5ff", middle: "#d8dff0", bottom: "#9ea9c8" },
    },
    ch02: {
      video: "/xianxia/steady-dao/backgrounds/ch02-herb-garden-hd.mp4",
      poster: "/xianxia/steady-dao/backgrounds/ch02-herb-garden-hd.jpg",
      label: "云上药圃里的蓝灵娥",
      tone: { top: "#f2f7ff", middle: "#d8e9e5", bottom: "#91ada9" },
    },
    ch03: {
      video: "/xianxia/steady-dao/backgrounds/ch03-cloud-route-hd.mp4",
      poster: "/xianxia/steady-dao/backgrounds/ch03-cloud-route-hd.jpg",
      label: "天庭文书抵达的云海航路",
      tone: { top: "#eef7ff", middle: "#cbdcf1", bottom: "#8799bd" },
    },
    ch04: {
      video: "/xianxia/steady-dao/backgrounds/ch04-cloud-night-feast-hd.mp4",
      poster: "/xianxia/steady-dao/backgrounds/ch04-cloud-night-feast-hd.jpg",
      label: "封神前夜的云上夜宴",
      tone: { top: "#f5eefb", middle: "#d9cbe8", bottom: "#887da5" },
    },
    ch05: {
      video: "/xianxia/steady-dao/backgrounds/ch05-lantern-court-hd.mp4",
      poster: "/xianxia/steady-dao/backgrounds/ch05-lantern-court-hd.jpg",
      label: "大道之庭映出的万家灯火",
      tone: { top: "#fff1e8", middle: "#dbcbdc", bottom: "#766e91" },
    },
  },
  backgroundMusic: {
    src: "/xianxia/steady-dao/audio/light-guofeng-theme.mp3",
    title: "古风轻快中国风",
    queue: [{
      src: "/xianxia/steady-dao/audio/qingyi-theme.mp3",
      title: "青衣（新版）",
    }],
  },
  mediaCues: {
    steady_ch01_s01_m02: [{
      id: "steady_story_ch01_courtyard",
      kind: "image",
      src: "/xianxia/steady-dao/story/ch01-courtyard-hd.png",
      alt: "云上小琼峰石桌旁三名年轻修士正在说笑",
      caption: "小琼峰今日无事 · 一壶茶前的三人日常",
    }],
    steady_ch02_s01_m01: [{
      id: "steady_story_ch02_herb_garden",
      kind: "image",
      src: "/xianxia/steady-dao/story/ch02-herb-garden-hd.png",
      alt: "蓝灵娥在云上药圃回头望向你",
      caption: "乌龙谷前 · 这一次她想参与自己的计划",
    }],
    steady_ch03_s01_m01: [{
      id: "steady_story_ch03_cloud_route",
      kind: "image",
      src: "/xianxia/steady-dao/story/ch03-cloud-route.jpg",
      alt: "文书官沿云海航路来到小琼峰",
      caption: "天庭云路 · 一个不存在的人有了俸禄",
    }],
    steady_ch04_s01_m01: [{
      id: "steady_story_ch04_celestial_sea",
      kind: "image",
      src: "/xianxia/steady-dao/story/ch04-celestial-sea.jpg",
      alt: "封神前夜云海上灯火密集的仙城",
      caption: "三界同夜 · 三封信一起到了",
    }],
    steady_ch05_s01_m01: [{
      id: "steady_story_ch05_lantern_court",
      kind: "image",
      src: "/xianxia/steady-dao/story/ch05-lantern-court.jpg",
      alt: "月下灯火延伸到大道之庭",
      caption: "大道之庭 · 规则终于亲自开口",
    }],
  },
  chapterEndPreviews: [
    {
      chapterId: "ch01",
      chapterNumber: 1,
      title: "一名探子，八百座阵",
      summary: "闯阵者没有机会碰到真正的杀阵便被纸人捆回院中。麻烦很快解决，他携带的外务符却证明小琼峰的公开路径已经从宗门内部流出。",
      nextObjective: "查清被改动的历练路线，并决定蓝灵娥能知道多少。",
      content: [
        { id: "steady_end_ch01_image", kind: "image", src: "/xianxia/steady-dao/story/ch01-courtyard-hd.png", alt: "小琼峰三人围坐云台", caption: "小琼峰今日无事——至少表面如此" },
        { id: "steady_end_ch01_hud", kind: "hud", eyebrow: "小琼峰安全札记", title: "今日仍可算无事", rows: [
          { label: "暴露底牌", value: "零座核心阵法" },
          { label: "捕获", value: "探路者一名" },
          { label: "新增风险", value: "宗门路径外泄", tone: "warning" },
        ], note: "蓝灵娥已经确认你在瞒事，而且不准备装作没看见。" },
      ],
    },
    {
      chapterId: "ch02",
      chapterNumber: 2,
      title: "安全不能只由一个人解释",
      summary: "伏击被纸人提前拆掉，蓝灵娥也第一次参与了自己的撤离方案。她接受你的谨慎，却拒绝继续只收到一个已经决定好的结果。",
      nextObjective: "追查香火兑票背后的买家，以及突然拥有官署记录的‘长庚’。",
      content: [
        { id: "steady_end_ch02_image", kind: "image", src: "/xianxia/steady-dao/story/ch02-herb-garden-hd.png", alt: "蓝灵娥站在云上药圃", caption: "乌龙谷之外 · 她进入了自己的撤离图" },
        { id: "steady_end_ch02_hud", kind: "hud", eyebrow: "关系与风险", title: "主动安全域 · 初成", rows: [
          { label: "纸人损耗", value: "三具，可回收两具" },
          { label: "师妹知情度", value: "由一成升至四成" },
          { label: "身份异常", value: "长庚已被记入天庭", tone: "warning" },
        ] },
      ],
    },
    {
      chapterId: "ch03",
      chapterNumber: 3,
      title: "一个不存在的人升官了",
      summary: "纸人长庚替你接下天庭文书，也开始影响真实水路与凡人生计。你没有暴露真身，却再也不能假装这只是一次临时伪装。",
      nextObjective: "在大劫正式落子前，决定哪些人可以进入你的真实布局。",
      content: [
        { id: "steady_end_ch03_image", kind: "image", src: "/xianxia/steady-dao/story/ch03-cloud-route.jpg", alt: "云海航路上的天庭来客", caption: "长庚入册 · 纸人开始领俸禄" },
        { id: "steady_end_ch03_hud", kind: "hud", eyebrow: "三界身份簿", title: "海神长庚", rows: [
          { label: "官阶", value: "不高，但文书很多" },
          { label: "功德", value: "两份已入账" },
          { label: "真实存在", value: "理论上没有", tone: "warning" },
        ] },
      ],
    },
    {
      chapterId: "ch04",
      chapterNumber: 4,
      title: "大劫没有旁观席",
      summary: "你公开了足以共同决策的布局，也承认谨慎背后并不只有理性，还有死过一次的人对失去的恐惧。身边人选择留下，但不再接受被动保护。",
      nextObjective: "带着共同决定的方案进入大道之庭。",
      content: [
        { id: "steady_end_ch04_image", kind: "image", src: "/xianxia/steady-dao/story/ch04-celestial-sea.jpg", alt: "封神前夜的云海仙城", caption: "大劫之前 · 旁观席已经撤走" },
        { id: "steady_end_ch04_hud", kind: "hud", eyebrow: "均衡道推演", title: "胜算不足两成", rows: [
          { label: "个人生还", value: "九成八" },
          { label: "众生保有选择", value: "一成九", tone: "warning" },
          { label: "同行者", value: "不再由你单方面删减" },
        ] },
      ],
    },
    {
      chapterId: "ch05",
      chapterNumber: 5,
      title: "活着这件小事",
      summary: "大道之庭开启，旧规则第一次接受众生共同审视。你以均衡道支付代价，修为退回金仙，也失去了成圣捷径，却保住了所有人继续选择生活的余地。",
      content: [
        { id: "steady_end_ch05_image", kind: "image", src: "/xianxia/steady-dao/story/ch05-balance-court.jpg", alt: "云海长阶上，两道身影共同走向大道之庭", caption: "均衡道展开 · 选择重新交还众生" },
        { id: "steady_end_ch05_hud", kind: "hud", eyebrow: "最终状态", title: "稳字经 · 末页", rows: [
          { label: "修为", value: "金仙 · 可慢慢重修" },
          { label: "成圣路径", value: "已关闭" },
          { label: "明日", value: "仍有不止一条路" },
        ], note: "蓝灵娥后来补上了第四行：稳，不等于一个人把所有门都锁上。" },
      ],
    },
  ],
  segments: [
    {
      id: "steady_ch01_s01",
      chapterId: "ch01",
      location: "度仙门小琼峰草屋前庭与西崖迷阵",
      present: ["lan_linge", "jiu_jiu", "qi_yuan"],
      goal: "让你确认闯阵者的目标与情报水平，同时不暴露真实修为和八百座阵法。",
      focusRelationships: ["r_li_lan", "r_li_jiu"],
      pressure: "封神因果正在收紧，任何异常都可能是大教、宗门或私人仇怨的试探；越早暴露底牌，未来越难退出。",
      dramaticQuestion: "你会怎样处理西崖入侵，同时决定要让蓝灵娥与酒玖知道和参与到什么程度？",
      completionSignals: [
        "闯阵者或入侵事件已经按玩家选择形成明确、不可撤销的处境，不能仍停在准备处理。",
        "玩家至少取得一项可验证信息；若玩家主动放弃原调查，则必须形成能关闭原路径的明确代价或新局面。",
        "蓝灵娥与酒玖对风险的知情与参与方式已经产生可见变化，并出现可继续行动的新方向。",
      ],
      materials: [
        { id: "steady_ch01_s01_m01", content: "西崖第一层迷阵被陌生人越过；只有你感知到警示，蓝灵娥与酒玖仍在为罚抄和藏酒缠着你。" },
        {
          id: "steady_ch01_s01_m02",
          content: "玩家针对西崖警示采取的第一项具体措施生效。困阵、纸人、本人移动或其他已经明确执行的手段改变现场，但本轮只解决控场问题，不提前揭晓闯阵者的来历，也不自动结束整场调查。",
          trigger: "玩家明确处理西崖警示、布置控场手段、亲自前往，或现场后果已经使控场动作无法合理延后。仅谈感情、藏酒、罚抄、闲聊或泛泛表示警惕时不触发。",
          completionEvidence: "正文必须具体写出玩家手段如何落地，以及闯阵者当前被困、被监视、被截断退路或仍在逃逸的明确现场状态。",
          echo: "阵盘或玩家已经布下的手段可以轻微回响，但不揭晓闯阵者身份。",
          divergence: "玩家若离开小琼峰、公开警报或直接毁掉现场，就让入侵事件沿新条件产生追责、逃逸或公开冲突。",
        },
        {
          id: "steady_ch01_s01_m03",
          content: "控场之后，闯阵者的即时结果得到确认。生擒、受伤、逃脱或死亡必须严格承接玩家此前已经造成的事实；如果仍能控制则可被押住或隔离，如果已经逃脱或死亡则保留痕迹、尸身与追责。本次侵入不凭空追加第二批敌人。",
          trigger: "玩家确认控场结果、搜身、接近查看、审问、追捕、收尸或处理已经发生的直接后果时触发。若玩家转去处理关系、日常或其他事务，就维持现状而不自动确认全部结果。",
          completionEvidence: "正文必须让闯阵者处境成为可见事实，并让在场人物对玩家选择产生具体反应；不能只写正在靠近、准备审问或似乎已经控制。",
        },
        {
          id: "steady_ch01_s01_m04",
          content: "玩家从闯阵者、随身物、路线、尸身或残留痕迹中取得第一层可验证信息：对方只掌握小琼峰的公开路径，不知道隐藏杀阵，像是受人雇来摸清巡视空隙。此时只能证明有人收集路线，尚不能直接断定幕后身份。",
          trigger: "玩家实际审问、搜查、验符、检查痕迹、比对路线或命令纸人取证时触发。单纯猜测幕后黑手、威吓俘虏但没有完成取证，或继续谈感情时不触发。",
          completionEvidence: "正文必须出现一个玩家当场可核验的证词或物证，并明确它能证明什么、暂时不能证明什么。",
        },
        {
          id: "steady_ch01_s01_m05",
          content: "进一步核验后，路线或随身符物上的真实外务符被确认来自度仙门内部流转渠道，但具体经手者仍未查清。蓝灵娥由此确认危险确实与自己有关，不接受以后永远只在事后被告知；酒玖则以外务经验指出追查符物来源比立刻惊动全宗更有用。",
          trigger: "玩家继续追查物证来源、核验外务符、调取流转记录，或在已经公开第一层证据后与蓝灵娥、酒玖商议知情范围和下一步时触发。尚未取得第一层证据时不得跳到内部来源。",
          completionEvidence: "正文必须完成外务符来源的有限确认、让蓝灵娥的关系诉求得到玩家可回应的清楚表达，并形成下一步核查公开路线或符物流转的具体目标。",
        },
      ],
      exit: "闯阵者的处境已按玩家行动形成不可撤销的结果；外务符的内部来源得到有限确认，你与蓝灵娥、酒玖形成了继续核查公开路线和符物流转的具体安排。",
    },
    {
      id: "steady_ch02_s01",
      chapterId: "ch02",
      location: "小琼峰丹房、药田与乌龙谷外围",
      present: ["lan_linge", "jiu_jiu", "qi_yuan"],
      goal: "查清历练路线被修改的方式，用纸人拆掉伏击，并让蓝灵娥真正参与与自己有关的决定。",
      focusRelationships: ["r_li_lan"],
      pressure: "你能把蓝灵娥藏在绝对安全的地方，却不能在不伤害关系的情况下永远替她决定。",
      dramaticQuestion: "你能否拆掉针对蓝灵娥的伏击，同时不再替她决定她有权知道和承担什么？",
      completionSignals: ["伏击或被篡改路线已被处理成明确结果。", "蓝灵娥实际参与或明确拒绝了自己的参与方式。", "香火兑票或另一条由玩家选择造成的因果入口已经出现。"],
      materials: [
        { id: "steady_ch02_s01_m01", content: "新旧路线图对照显示外务殿公印被揭开重贴，蓝灵娥的停留点被改到废弃山神庙；她主动提出自己可以参与的低风险部分。" },
        { id: "steady_ch02_s01_m02", content: "三具纸人代替采药队进入山神庙，按玩家方案拆掉伏击并留下活口；蓝灵娥负责辨认路线与撤离信号，第一次参与而非只被保护。" },
        { id: "steady_ch02_s01_m03", content: "活口只知道买家使用东海香火兑票；玩家假符上的‘长庚’落款已经被天庭记为真实功德身份，危险从宗门路线延伸到三界账册。" },
      ],
      exit: "伏击被拆除，蓝灵娥安全返峰；长庚身份的官署记录迫使你调查更大的因果链。",
    },
    {
      id: "steady_ch03_s01",
      chapterId: "ch03",
      location: "小琼峰前庭、纸人密室与天庭驻地",
      present: ["lan_linge", "jiu_jiu", "qi_yuan", "tian_ting_clerk"],
      goal: "让纸人长庚在不暴露真身的前提下接入天庭文书，查清香火账如何影响凡间水路。",
      focusRelationships: ["r_li_lan", "r_li_jiu"],
      pressure: "一个伪造身份一旦被制度承认，就会产生真实职责；继续隐藏可以保命，也可能让凡人替你的沉默付代价。",
      dramaticQuestion: "当长庚这个假身份产生真实责任，你是继续藏在纸人后，还是用它改变凡人的处境？",
      completionSignals: ["长庚身份的责任得到玩家明确处置。", "凡间水路或受影响众生出现可见结果。", "玩家与身边人对安全和责任的理解产生可继续的变化。"],
      materials: [
        { id: "steady_ch03_s01_m01", content: "木公小吏带来长庚的正式文书：假身份因两次水路功德被天庭承认，还有一笔无人领取的俸禄与必须处理的祈文。" },
        { id: "steady_ch03_s01_m02", content: "长庚纸人查出东海香火兑票被人用来购买仙门路线与凡间灾情，继续旁观会让沿岸村镇成为大教试探的代价。" },
        { id: "steady_ch03_s01_m03", content: "玩家以信息差修正水路并保住村镇，却让长庚获得更高官署权限；蓝灵娥发现你的安全布局已经影响远方陌生人的生活。" },
      ],
      exit: "长庚正式成为玩家介入三界的公开化身；你第一次主动触碰封神因果。",
    },
    {
      id: "steady_ch04_s01",
      chapterId: "ch04",
      location: "封神前夜的小琼峰与纸人情报阵",
      present: ["lan_linge", "jiu_jiu", "qi_yuan", "tian_ting_clerk"],
      goal: "在封神冲突迫近时公开足以共同决策的真相，让关系从单方面保护转为共同承担。",
      focusRelationships: ["r_li_lan", "r_li_jiu"],
      pressure: "最安全的个人方案是继续隐瞒并独自撤退；但大劫已经把身边人写入你的因果，他们不再接受只听最后结论。",
      dramaticQuestion: "你愿意让身边的人知道多少真相，又愿意把多少风险真正交给他们共同决定？",
      completionSignals: ["与同行者直接相关的风险已经被公开或被玩家明确拒绝公开并产生代价。", "每名关键同行者形成自己的知情选择。", "进入终局的共同方案或由玩家另选的新方案已经能被执行。"],
      materials: [
        { id: "steady_ch04_s01_m01", content: "三封文书同时逼近小琼峰：天庭要长庚调停两教，度仙门要护峰阵图，蓝灵娥则拿回一具替她挡劫的焦黑纸人。" },
        { id: "steady_ch04_s01_m02", content: "蓝灵娥与酒玖没有要求全部底牌，只要求知道与自己相关的风险；玩家必须在本轮具体回应这种关系诉求，不能只继续分析敌情。" },
        { id: "steady_ch04_s01_m03", content: "众人共同完成进入大道之庭的方案：玩家保留核心后手，蓝灵娥掌撤离阵，酒玖负责外部联络，齐源公开承担小琼峰的宗门责任。" },
      ],
      exit: "同行者在知情后仍选择进入风险；大道之庭方案成形。",
    },
    {
      id: "steady_ch05_s01",
      chapterId: "ch05",
      location: "大道之庭与洪荒众生映照出的长阶",
      present: ["lan_linge", "jiu_jiu", "qi_yuan", "hongjun"],
      goal: "让旧秩序解释牺牲逻辑，并由玩家决定是否以均衡道支付个人代价开启共同裁决。",
      focusRelationships: ["r_li_lan", "r_li_jiu"],
      pressure: "保住自己有九成八把握；开启大道之庭胜算不足两成，且会永久关闭成圣捷径。",
      dramaticQuestion: "面对旧秩序的稳定与众生重新选择的权利，你最终愿意支付什么代价？",
      completionSignals: ["各方理由和愿意承担的代价已经被玩家听见。", "玩家亲自作出最终选择。", "选择的直接后果与人物关系代价已经完整发生。"],
      materials: [
        { id: "steady_ch05_s01_m01", content: "鸿钧提出让玩家接手维护旧秩序，承认局部牺牲却称这是天地稳定的必要价格；他不是空洞反派，必须给出完整、理性的理由。" },
        { id: "steady_ch05_s01_m02", content: "蓝灵娥、酒玖与齐源分别说出愿意承担与绝不接受的代价，不替玩家决定；关系与共同记忆必须进入最终辩论。" },
        { id: "steady_ch05_s01_m03", content: "最终选择明确交还玩家：以均衡道开启大道之庭，或保留力量寻找另一条路。NPC可以追问玩家或准备行动，但不得替玩家完成选择。" },
        { id: "steady_ch05_s01_m04", content: "忠实执行玩家上一轮已经明确作出的最终选择并演出直接后果；若玩家尚未选择，则继续回应与澄清，不能擅自结局。" },
      ],
      exit: "玩家的最终选择得到执行，稳字经写下属于这段经历的最后一行。",
    },
  ],
  styleProfile: steadyDaoEnsembleRomanceStyle,
};

export const xianxiaStories: Partial<Record<XianxiaStory["id"], XianxiaStory>> = {
  "steady-dao": steadyDao,
};

export function getXianxiaStory(id: string | undefined) {
  return id && id in xianxiaStories ? xianxiaStories[id as XianxiaStory["id"]] : undefined;
}
