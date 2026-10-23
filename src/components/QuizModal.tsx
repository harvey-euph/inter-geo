import React, { useState } from 'react';
import { X, Award, CheckCircle2, XCircle, ArrowRight, MapPin } from 'lucide-react';
import { COUNTRIES_DATA } from '../data/countries';

interface QuizQuestion {
  id: number;
  clueTitle: string;
  clueDetails: string;
  categoryTag: string;
  correctCountryIso2: string;
  optionsIso2: string[];
  explanation: string;
}

const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 1,
    clueTitle: '車頭特殊的黑色涉水喉 (Snorkel)',
    clueDetails: '街景車車頭右前方凸出一根黑色管狀進氣涉水喉，四周是金黃色合歡樹稀樹草原與紅土地質，車輛靠左行駛。',
    categoryTag: '🚙 街景設備',
    correctCountryIso2: 'KE',
    optionsIso2: ['KE', 'ZA', 'GH', 'BW'],
    explanation: '肯亞 (Kenya) 的 Google 街景車配有專屬的涉水喉 (Snorkel)，且肯亞為靠左行駛！'
  },
  {
    id: 2,
    clueTitle: '車頂行李架纏有一圈黑色膠帶 (Black Tape)',
    clueDetails: '四根金屬車頂架中，右前方金屬架纏有顯眼的黑色電工膠帶，路邊商店常有 MTN 黃色招牌與虔誠基督教標語。',
    categoryTag: '🚙 街景設備',
    correctCountryIso2: 'GH',
    optionsIso2: ['NG', 'GH', 'SN', 'KE'],
    explanation: '迦納 (Ghana) 的街景拍攝車頂行李架右前桿纏有一圈黑色膠帶，是非常具代表性的區域拍攝特徵。'
  },
  {
    id: 3,
    clueTitle: '電線桿底部有黑黃相間斜斑馬紋',
    clueDetails: '水泥電線桿底部貼滿了黃黑斜條紋防撞警示貼紙，且招牌全為繁體中文，機車密度極高。',
    categoryTag: '🪵 電線桿特徵',
    correctCountryIso2: 'TW',
    optionsIso2: ['TW', 'JP', 'KR', 'TH'],
    explanation: '台灣 (Taiwan) 的電線桿底部標準配備為黃黑斜紋防撞漆/貼紙，搭配繁體中文門牌與招牌！'
  },
  {
    id: 4,
    clueTitle: '北歐唯一中央為「鮮豔單黃線」的國家',
    clueDetails: '路面中央劃設鮮豔的單黃實線，路邊是白色短虛線，遠方有壯麗的峽灣與雪山，路上偶爾看見綠底黑字的貨車牌照。',
    categoryTag: '🛣️ 道路標線',
    correctCountryIso2: 'NO',
    optionsIso2: ['SE', 'FI', 'NO', 'IS'],
    explanation: '挪威 (Norway) 是北歐極罕見以黃色作為道路中央線的國家（瑞典和芬蘭均為全白線），且雙座商用車有綠底牌照！'
  },
  {
    id: 5,
    clueTitle: '方形混凝土梯子桿 (Ladder Holes Pole)',
    clueDetails: '筆直的水泥電線桿上排列著整齊貫通的長方形孔洞，防撞柱為白色帶紅色整圈橫帶，文字充滿了 ł, ą, ę 等字母。',
    categoryTag: '🪵 電線桿特徵',
    correctCountryIso2: 'PL',
    optionsIso2: ['PL', 'CZ', 'RO', 'HU'],
    explanation: '波蘭 (Poland) 的標誌性特徵為佈滿長方形孔洞的混凝土梯子桿，以及紅圈橫切的紅白防撞柱！'
  },
  {
    id: 6,
    clueTitle: '全球最亮眼的鮮黃色防撞柱 (Yellow Bollards)',
    clueDetails: '公路旁立著鮮黃色木質細柱，四周完全沒有任何高大樹木，眼前是黑色火山石地貌與連綿苔原。',
    categoryTag: '🚧 防撞導標',
    correctCountryIso2: 'IS',
    optionsIso2: ['IS', 'IE', 'NZ', 'CL'],
    explanation: '冰島 (Iceland) 擁有全球辨識度最高的亮黃色防撞導標，且島上幾無高大林木！'
  },
  {
    id: 7,
    clueTitle: '車牌前白後黃，且靠左行駛',
    clueDetails: '路上所有車輛前方為白色長牌、後方為黃色長牌，城鎮充滿紅磚聯排住宅，地面常劃設 LOOK LEFT。',
    categoryTag: '🪪 車牌特徵',
    correctCountryIso2: 'GB',
    optionsIso2: ['GB', 'IE', 'AU', 'NL'],
    explanation: '英國 (United Kingdom) 的經典特徵就是「前白後黃」車牌，愛爾蘭後方則是白牌！'
  }
];

interface QuizModalProps {
  onClose: () => void;
  onSelectCountryByIso2?: (iso2: string) => void;
}

export const QuizModal: React.FC<QuizModalProps> = ({ onClose, onSelectCountryByIso2 }) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [score, setScore] = useState(0);

  const question = QUIZ_QUESTIONS[currentIdx];
  const isAnswered = selectedOption !== null;

  const handleSelect = (iso2: string) => {
    if (isAnswered) return;
    setSelectedOption(iso2);
    if (iso2 === question.correctCountryIso2) {
      setScore((prev) => prev + 1);
    }
  };

  const handleNext = () => {
    if (currentIdx < QUIZ_QUESTIONS.length - 1) {
      setCurrentIdx((prev) => prev + 1);
      setSelectedOption(null);
    } else {
      // Finished
      alert(`🎉 恭喜完成！您的總得分是 ${score + (selectedOption === question.correctCountryIso2 ? 1 : 0)} / ${QUIZ_QUESTIONS.length}`);
      onClose();
    }
  };

  const handleInspectMap = (iso2: string) => {
    if (onSelectCountryByIso2) {
      onSelectCountryByIso2(iso2);
    }
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Award size={20} color="#38bdf8" />
            <span style={{ fontWeight: 600, fontSize: 16 }}>世界地理與道路文化測驗</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
              得分：{score} / {currentIdx}
            </span>
            <button className="close-btn" onClick={onClose}>
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="modal-body">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="intel-tag highlight">{question.categoryTag}</span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              題目 {currentIdx + 1} / {QUIZ_QUESTIONS.length}
            </span>
          </div>

          <div className="quiz-clue-box">
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
              {question.clueTitle}
            </div>
            <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              {question.clueDetails}
            </div>
          </div>

          {/* Options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {question.optionsIso2.map((iso2) => {
              const country = COUNTRIES_DATA.find((c) => c.iso2 === iso2);
              if (!country) return null;

              const isSelected = selectedOption === iso2;
              const isCorrect = iso2 === question.correctCountryIso2;

              let btnClass = 'quiz-option-btn';
              if (isAnswered) {
                if (isCorrect) btnClass += ' correct';
                else if (isSelected) btnClass += ' wrong';
              }

              return (
                <button
                  key={iso2}
                  className={btnClass}
                  onClick={() => handleSelect(iso2)}
                  disabled={isAnswered}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 20 }}>{country.flag}</span>
                    <span style={{ fontWeight: 600 }}>{country.nameZh}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>({country.name})</span>
                  </div>
                  {isAnswered && (
                    <div>
                      {isCorrect ? (
                        <CheckCircle2 size={18} color="#10b981" />
                      ) : isSelected ? (
                        <XCircle size={18} color="#ef4444" />
                      ) : null}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Explanation if answered */}
          {isAnswered && (
            <div
              style={{
                backgroundColor: 'rgba(56, 189, 248, 0.1)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                borderRadius: 8,
                padding: '12px 16px',
                fontSize: 13,
                lineHeight: 1.5,
                color: '#93c5fd',
                display: 'flex',
                flexDirection: 'column',
                gap: 8
              }}
            >
              <div>
                <strong>💡 解說：</strong>
                {question.explanation}
              </div>
              <button
                style={{
                  alignSelf: 'flex-start',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  background: 'rgba(56, 189, 248, 0.2)',
                  border: '1px solid rgba(56, 189, 248, 0.4)',
                  color: '#e0f2fe',
                  borderRadius: 6,
                  padding: '4px 8px',
                  fontSize: 12,
                  cursor: 'pointer'
                }}
                onClick={() => handleInspectMap(question.correctCountryIso2)}
              >
                <MapPin size={13} />
                <span>在地圖中查看情報</span>
              </button>
            </div>
          )}

          {/* Next Button */}
          {isAnswered && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
              <button className="btn-header btn-primary" onClick={handleNext}>
                <span>下一題</span>
                <ArrowRight size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
