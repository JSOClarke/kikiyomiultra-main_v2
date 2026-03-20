// Mock data representing a parsed audiobook + subtitle set
// This perfectly simulates the final output our future file parser will generate.
import { AudioBook, EpubBook } from '../types';

// 50 lines of "Momotaro" broken up algorithmically for mock playback
const generateMockSubtitles = () => {
  const storyLines = [
    "むかしむかし、あるところに、おじいさんとおばあさんがいました。",
    "おじいさんは山へ芝刈りに、おばあさんは川へ洗濯に行きました。",
    "おばあさんが川で洗濯をしていると、ドンブラコ、ドンブラコと、",
    "大きな桃が流れてきました。",
    "「おや、まあ、大きな桃だこと。家に持って帰ろう。」",
    "おばあさんは、その桃を拾い上げて、家に帰りました。",
    "夕方、おじいさんが山から帰ってきました。",
    "「おじいさん、お帰りなさい。川でこんなに大きな桃を拾いましたよ。」",
    "「ほう、これは見事な桃だ。さっそく割って食べよう。」",
    "おじいさんが包丁で桃を割ろうとすると、",
    "桃がパカッと割れて、中から元気な男の子が飛び出しました。",
    "「おぎゃあ、おぎゃあ。」",
    "二人はたいそう驚きましたが、とても喜びました。",
    "「桃から生まれたから、桃太郎と名付けよう。」",
    "おじいさんとおばあさんは、桃太郎を大切に育てました。",
    "桃太郎は、ご飯を一杯食べると一杯分、",
    "二杯食べると二杯分大きくなりました。",
    "そして、あっという間に立派な若者に成長しました。",
    "桃太郎は、力も強く、心も優しい男の子でした。",
    "ある日のこと、桃太郎はおじいさんとおばあさんの前に手をついて言いました。",
    "「おじいさん、おばあさん。今まで育ててくれてありがとうございました。」",
    "「私はこれから、鬼ヶ島へ鬼退治に行ってまいります。」",
    "それを聞いたおじいさんとおばあさんはびっくりしました。",
    "「鬼ヶ島には恐ろしい鬼が住んでいるという。危ないからおやめなさい。」",
    "しかし、桃太郎の決心は固く、変わりませんでした。",
    "「村の人々を苦しめる悪い鬼を、どうしても退治したいのです。」",
    "おじいさんとおばあさんは、桃太郎の強い思いを知り、許すことにしました。",
    "おじいさんは、桃太郎に刀と刀のさやを作ってやりました。",
    "おばあさんは、おいしい日本一のきびだんごを作ってやりました。",
    "「さあ、これを持ってお行きなさい。気をつけてな。」",
    "桃太郎は、きびだんごを腰に下げて、元気に出発しました。",
    "ズンズン歩いていくと、大きな犬が走ってきました。",
    "「桃太郎さん、桃太郎さん。お腰につけたきびだんご、一つ私にくださいな。」",
    "「これをやろう。その代わり、私のお供になりなさい。」",
    "「はい、お供します。」犬はきびだんごをもらって、家来になりました。",
    "さらに歩いていくと、今度は猿が木から降りてきました。",
    "「桃太郎さん、お腰につけたきびだんご、一つ私にくださいな。」",
    "「これをやろう。その代わり、私のお供になりなさい。」",
    "「はい、お供します。」猿もきびだんごをもらって、家来になりました。",
    "そしてまた歩いていくと、空からキジが飛んできました。",
    "「桃太郎さん、お腰につけたきびだんご、一つ私にくださいな。」",
    "「これをやろう。その代わり、私のお供になりなさい。」",
    "「はい、お供します。」キジもきびだんごをもらって、家来になりました。",
    "こうして、犬、猿、キジを家来にした桃太郎は、とうとう海へ出ました。",
    "桃太郎たちは、大きな船に乗って鬼ヶ島へ向かいました。",
    "ザブーン、ザブーンと波をかき分け、船はどんどん進みます。",
    "やがて、遠くに黒い雲に覆われた恐ろしい島が見えてきました。",
    "「あれが鬼ヶ島だ！みんな、準備はいいか！」",
    "「「「おおーっ！」」」",
    "鬼ヶ島に着くと、大きな黒い門がそびえ立っていました。",
    "キジが空に飛び上がり、門の鍵を開けました。",
    "猿がスルスルと壁を登り、門を押し開けました。",
    "犬がワンワンと吠えながら、一番に飛び込んでいきました。",
  ];

  const subs = [];
  let currentTime = 0;
  
  for (let i = 0; i < storyLines.length; i++) {
    const textLength = storyLines[i].length;
    const duration = Math.max(2.5, textLength * 0.18); // Rough estimate of spoken length
    
    subs.push({
      id: `sub_${i + 1}`,
      startTime: currentTime,
      endTime: currentTime + duration,
      text: storyLines[i],
    });
    
    // Add a small pause between lines
    currentTime += duration + 0.5;
  }
  
  return subs;
};

const mockSubs = generateMockSubtitles();
const finalDuration = mockSubs[mockSubs.length - 1].endTime + 1; // +1s buffer

export const MOCK_BOOK: AudioBook = {
  id: 'book_mock_001',
  title: 'Japanese Graded Readers: Vol 1 (Momotaro)',
  author: 'Traditional Folklore',
  type: 'audiobook',
  duration: finalDuration, 
  // We use SoundHelix as it provides a stable, direct MP3 that supports 
  // browser Range requests, allowing us to seek properly. 
  // Pixabay 302 redirects disable HTML5 seeking.
  audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', 
  subtitles: mockSubs
};

export const MOCK_EPUB: EpubBook = {
  id: 'book_mock_002',
  title: 'Text Only: Vol 1 (Momotaro)',
  author: 'Traditional Folklore',
  type: 'epub',
  subtitles: mockSubs
};
