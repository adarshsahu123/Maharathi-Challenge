import type { Question, QuestionBank } from '../../game/types';

/**
 * CLASS 9 — ICT question bank (DRAFT).
 *
 * Questions 1-20 (ids c9-q01 .. c9-q20) were supplied by the teacher from syllabus excerpts and are marked
 * "draft": the teacher must verify wording against the full study material.
 * Questions c9-q21 .. c9-q30 were ADDED BY THE DEVELOPER on the same topics to reach 30 questions. They carry
 * `needsReview: true` (the Teacher Panel shows "please verify") — replace or approve them.
 * Edit any text below; the game engine does not need to change.
 *
 * Rules enforced by src/game/validation.ts when the game starts:
 *  - exactly 4 distinct options, `correctIndex` 0-3 (0 = A, 1 = B, 2 = C, 3 = D)
 *  - `removableIndices` = two INCORRECT options that 50:50 may remove
 *  - points: Easy 10 / Intermediate 20 / Hard 30
 *  - order: 8 Easy, then 14 Intermediate, then 8 Hard (ids do not have to be in order)
 */

const q = (
  n: number,
  topic: string,
  difficulty: Question['difficulty'],
  text: string,
  options: [string, string, string, string],
  correctIndex: number,
  removableIndices: [number, number],
  explanation: string,
): Question => ({
  id: `c9-q${String(n).padStart(2, '0')}`,
  classLevel: 9,
  topic,
  text,
  options,
  correctIndex,
  explanation,
  difficulty,
  points: difficulty === 'Easy' ? 10 : difficulty === 'Intermediate' ? 20 : 30,
  removableIndices,
});

/** A question added by the developer: identical shape, flagged so the teacher knows to verify it. */
const added = (...args: Parameters<typeof q>): Question => ({ ...q(...args), needsReview: true });

export const class9Questions: Question[] = [
  // ───── ROUND 1: EASY — 10 points each ─────
  q(1, 'IPO Cycle', 'Easy',
    'Computer के IPO Cycle में Data को Process कौन करता है?',
    ['Input', 'Process', 'Output', 'Storage'], 1, [2, 3],
    'IPO Cycle में Process का काम Input Data पर गणना और आवश्यक Processing करना है.'),
  q(2, 'Input Device', 'Easy',
    'निम्नलिखित में से कौन-सा Input Device है?',
    ['Monitor', 'Printer', 'Keyboard', 'Speaker'], 2, [1, 3],
    'Keyboard की मदद से Computer में Text, Numbers और Commands दर्ज किए जाते हैं.'),
  q(3, 'Output Device', 'Easy',
    'Computer में Output देखने के लिए किस Device का उपयोग किया जाता है?',
    ['Mouse', 'Scanner', 'Keyboard', 'Monitor'], 3, [1, 2],
    'Monitor पर Text, Images और Videos जैसे Visual Outputs दिखाई देते हैं.'),
  q(4, 'Memory', 'Easy',
    'कौन-सी Memory Volatile होती है?',
    ['ROM', 'RAM', 'SSD', 'Pen Drive'], 1, [2, 3],
    'RAM एक Volatile Memory है. Power बंद होने पर इसमें मौजूद Data खो जाता है.'),
  q(5, 'Software', 'Easy',
    'निम्नलिखित में से कौन-सा Application Software है?',
    ['Operating System', 'Device Driver', 'Microsoft Word', 'BIOS'], 2, [1, 3],
    'Microsoft Word एक Application Software है, जिसका उपयोग Documents बनाने और Edit करने के लिए किया जाता है.'),

  // Added by the developer (verify): three more Easy questions.
  added(21, 'Central Processing Unit', 'Easy',
    'Computer का "Brain" किसे कहा जाता है?',
    ['CPU', 'Monitor', 'Keyboard', 'Printer'], 0, [1, 3],
    'CPU (Central Processing Unit) Computer के सारे Instructions को Process करता है, इसलिए इसे Computer का Brain कहा जाता है.'),
  added(22, 'Output Device', 'Easy',
    'Computer के Data को Paper पर Hard Copy के रूप में निकालने के लिए किस Device का उपयोग किया जाता है?',
    ['Scanner', 'Printer', 'Mouse', 'Speaker'], 1, [2, 3],
    'Printer एक Output Device है, जो Computer के Data को Paper पर Print करके Hard Copy देता है.'),
  added(23, 'RAM', 'Easy',
    'RAM का पूरा नाम क्या है?',
    ['Random Access Memory', 'Read Access Memory', 'Run Active Memory', 'Rapid Allocated Memory'], 0, [2, 3],
    'RAM का पूरा नाम Random Access Memory है. यह Computer की Working Memory है.'),

  // ───── ROUND 2: INTERMEDIATE — 20 points each ─────
  q(6, 'Types of Computer', 'Intermediate',
    'Analog Computer किस प्रकार के Data पर काम करता है?',
    ['केवल Binary Data', 'Continuous Data', 'केवल Text', 'केवल Images'], 1, [2, 3],
    'Analog Computer Continuous Data या लगातार बदलने वाले Signals पर काम करता है.'),
  q(7, 'Types of Computer', 'Intermediate',
    'ATM Machine किस प्रकार के Computer का उदाहरण है?',
    ['General Purpose Computer', 'Special Purpose Computer', 'Analog Computer', 'Tablet Computer'], 1, [2, 3],
    'ATM एक विशेष उद्देश्य के लिए डिजाइन किया गया सिस्टम है.'),
  q(8, 'Cache Memory', 'Intermediate',
    'CPU की Speed बढ़ाने में कौन-सी Memory मदद करती है?',
    ['Cache Memory', 'DVD', 'Pen Drive', 'Memory Card'], 0, [1, 3],
    'Cache Memory CPU को बार-बार उपयोग होने वाला Data जल्दी उपलब्ध कराने में मदद करती है.'),
  q(9, 'ROM', 'Intermediate',
    'Computer बंद होने के बाद भी किस Memory में Data सुरक्षित रहता है?',
    ['RAM', 'Cache Memory', 'ROM', 'CPU Register'], 2, [1, 3],
    'ROM एक Non-Volatile Memory है और Power बंद होने पर भी अपना Data सुरक्षित रखती है.'),
  q(10, 'Types of ROM', 'Intermediate',
    'किस प्रकार की ROM को Ultraviolet Light की मदद से Erase किया जा सकता है?',
    ['PROM', 'EPROM', 'EEPROM', 'SRAM'], 1, [0, 3],
    'EPROM को पारंपरिक EPROM Chip में Ultraviolet Light की मदद से Erase किया जा सकता है.'),
  q(11, 'Cache Memory', 'Intermediate',
    'सामान्यतः CPU Core के सबसे करीब और सबसे तेज Cache Level कौन-सा होता है?',
    ['L1 Cache', 'L2 Cache', 'L3 Cache', 'RAM'], 0, [2, 3],
    'L1 Cache सामान्यतः सबसे छोटा और सबसे तेज Cache Level होता है.'),
  q(12, 'Open-Source Software', 'Intermediate',
    'Open-Source Software की मुख्य विशेषता क्या है?',
    [
      'इसका Source Code कभी नहीं देखा जा सकता',
      'इसके Source Code को Licence की शर्तों के अनुसार देखा और Modify किया जा सकता है',
      'यह केवल Offline चलता है',
      'इसे केवल एक Computer पर चलाया जा सकता है',
    ], 1, [2, 3],
    'Open-Source Software में Source Code के उपयोग, अध्ययन, संशोधन और वितरण के अधिकार उसकी Licence की शर्तों पर निर्भर करते हैं.'),
  q(13, 'Storage Devices', 'Intermediate',
    'निम्नलिखित में से कौन-सा Non-Volatile Storage Device है?',
    ['RAM', 'CPU Register', 'SSD', 'L1 Cache'], 2, [0, 3],
    'SSD बिना Power के भी Data सुरक्षित रखता है.'),
  q(14, 'Types of Computer', 'Intermediate',
    'Laptop में Desktop की तुलना में कौन-सी सुविधा सामान्यतः पहले से मौजूद होती है?',
    ['Built-in Battery', 'केवल External Keyboard', 'अलग से जोड़ा जाने वाला Monitor अनिवार्य है', 'केवल Wired Power Supply'], 0, [2, 3],
    'Laptop में सामान्यतः Built-in Battery, Screen और Keyboard होते हैं.'),
  q(15, 'Operating System', 'Intermediate',
    'Computer के Hardware और Memory को Manage करने वाला मुख्य System Software कौन-सा है?',
    ['MS Word', 'Paint', 'Operating System', 'Calculator App'], 2, [0, 3],
    'Operating System Computer के Hardware Resources, Memory और Applications को Manage करता है.'),

  // Added by the developer (verify): four more Intermediate questions.
  added(24, 'ROM', 'Intermediate',
    'ROM का पूरा नाम क्या है?',
    ['Read Only Memory', 'Random Output Memory', 'Read Output Method', 'Run Only Memory'], 0, [2, 3],
    'ROM का पूरा नाम Read Only Memory है. इसमें Data सामान्यतः केवल Read किया जाता है.'),
  added(25, 'Units of Data', 'Intermediate',
    '1 Byte में कितने Bits होते हैं?',
    ['4', '8', '16', '2'], 1, [2, 3],
    '1 Byte = 8 Bits होता है. Bit, Computer में Data की सबसे छोटी इकाई है.'),
  added(26, 'Application Software', 'Intermediate',
    'Microsoft Excel किस प्रकार का Software है?',
    ['Application Software', 'System Software', 'Firmware', 'Hardware'], 0, [2, 3],
    'Microsoft Excel एक Application Software है, जिसका उपयोग Spreadsheet बनाने और Calculations करने के लिए किया जाता है.'),
  added(27, 'Types of Computer', 'Intermediate',
    'Digital Computer किस रूप के Data को समझता और Process करता है?',
    ['Binary Data (0 और 1)', 'Continuous Signals', 'केवल Voice', 'केवल Light'], 0, [2, 3],
    'Digital Computer Data को Binary रूप में, यानी 0 और 1 के रूप में, समझता और Process करता है.'),

  // ───── ROUND 3: HARD — 30 points each ─────
  q(16, 'ROM / Firmware', 'Hard',
    'Computer की Power बंद होने के बाद भी Firmware को सुरक्षित रखने के लिए Memory में कौन-सा गुण होना आवश्यक है?',
    ['Volatility', 'Non-Volatility', 'Temporary Processing', 'Continuous Data Entry'], 1, [2, 3],
    'Non-Volatile Memory Power बंद होने पर भी Data सुरक्षित रखती है.'),
  q(17, 'Cache Memory', 'Hard',
    'यदि CPU को बार-बार उपयोग होने वाला Data जल्दी प्राप्त करना हो, तो कौन-सा विकल्प सबसे सीधे उसकी मदद करता है?',
    ['Monitor का Size बढ़ाना', 'Cache Memory का उपयोग', 'नया Printer लगाना', 'Keyboard बदलना'], 1, [0, 3],
    'Cache Memory Frequently Used Data को CPU के पास रखकर Access Time कम करने में मदद करती है.'),
  q(18, 'RAM and ROM', 'Hard',
    'RAM और ROM के बारे में कौन-सा कथन सही है?',
    [
      'RAM सामान्यतः Volatile और ROM Non-Volatile होती है',
      'RAM हमेशा Read-Only होती है',
      'ROM की सभी जानकारी Power बंद होने पर मिट जाती है',
      'RAM और ROM दोनों हमेशा Volatile होती हैं',
    ], 0, [1, 2],
    'RAM सामान्यतः Volatile Working Memory है, जबकि ROM Non-Volatile होती है.'),
  q(19, 'Open-Source Software', 'Hard',
    'एक School ऐसा Software उपयोग करना चाहता है, जिसके Source Code को उसकी Licence की शर्तों के अनुसार Study और Modify किया जा सके. कौन-सा Software उपयुक्त है?',
    ['Open-Source Software', 'केवल Proprietary Software', 'ऐसा Software जिसका Source Code हमेशा Secret हो', 'Hardware Device'], 0, [2, 3],
    'Open-Source Software की Licence Source Code को देखने और Modify करने के निर्धारित अधिकार प्रदान करती है.'),
  q(20, 'Firmware', 'Hard',
    'Computer Start होते समय Hardware को Initialize करने के लिए Low-Level Instructions कहाँ से मिलते हैं?',
    ['MS Word Document', 'Startup Firmware', 'Speaker', 'Keyboard'], 1, [0, 3],
    'Startup Firmware Hardware Initialization और शुरुआती Startup Process में मदद करता है.'),
  // Added by the developer (verify): three more Hard questions.
  added(28, 'Storage', 'Hard',
    'एक छात्र को Document बनाना है और उसे Power बंद होने के बाद भी बाद में उपयोग करना है. Document को कहाँ Save करना चाहिए?',
    ['SSD या Hard Disk में', 'RAM में', 'Cache Memory में', 'CPU Register में'], 0, [2, 3],
    'SSD या Hard Disk Non-Volatile Storage हैं, इसलिए Power बंद होने पर भी Data सुरक्षित रहता है. RAM, Cache Memory और Register Volatile होते हैं.'),
  added(29, 'Input and Output Devices', 'Hard',
    'Input Device और Output Device के बारे में कौन-सा कथन सही है?',
    [
      'Keyboard Input Device है और Monitor Output Device है',
      'Keyboard Output Device है और Monitor Input Device है',
      'Mouse और Printer दोनों Input Device हैं',
      'Scanner और Speaker दोनों Output Device हैं',
    ], 0, [2, 3],
    'Keyboard से Data Computer में डाला जाता है (Input), जबकि Monitor पर Result दिखाया जाता है (Output).'),
  added(30, 'IPO Cycle', 'Hard',
    'IPO Cycle का सही क्रम कौन-सा है?',
    ['Input → Process → Output', 'Process → Input → Output', 'Output → Process → Input', 'Input → Output → Process'], 0, [2, 3],
    'IPO Cycle में पहले Data Input लिया जाता है, फिर उसे Process किया जाता है और अंत में Output दिया जाता है.'),
];

/**
 * TIE-BREAKER — DRAFT written by the developer, NOT supplied by the teacher.
 * It is clearly flagged in the Teacher Panel. Replace it with an approved Hard question.
 */
export const class9Tiebreakers: Question[] = [
  {
    id: 'c9-tb01',
    classLevel: 9,
    topic: 'Memory Hierarchy (Tie-breaker — unapproved draft)',
    text: 'Speed के अनुसार सबसे तेज़ से सबसे धीमी Memory का सही क्रम सामान्यतः कौन-सा है?',
    options: [
      'CPU Register → Cache Memory → RAM → SSD',
      'SSD → RAM → Cache Memory → CPU Register',
      'RAM → Cache Memory → CPU Register → SSD',
      'Cache Memory → SSD → CPU Register → RAM',
    ],
    correctIndex: 0,
    removableIndices: [1, 3],
    explanation: 'CPU Register सबसे तेज़ होता है, उसके बाद Cache Memory, फिर RAM और सबसे धीमा Storage जैसे SSD.',
    difficulty: 'Hard',
    points: 30,
  },
];

export const class9Bank: QuestionBank = {
  id: 'class9-ict-draft',
  classLevel: 9,
  title: 'Class 9 — ICT (Computer Basics)',
  status: 'draft',
  note:
    'Draft: questions 1-20 are based on syllabus excerpts supplied by the teacher; 10 more questions were added by the developer ' +
    'to make 30 (the Teacher Panel marks them “please verify”). Please verify everything against the full study material. ' +
    'The tie-breaker question is not approved.',
  questions: class9Questions,
  tiebreakers: class9Tiebreakers,
};
