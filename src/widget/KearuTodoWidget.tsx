import React from 'react';
import {
  FlexWidget,
  TextWidget,
  ListWidget,
} from 'react-native-android-widget';
import { TodoItem } from '../types';

interface KearuTodoWidgetProps {
  todos: TodoItem[];
  completedTodayCount: number;
}

/**
 * Androidホーム画面ウィジェット
 * - 背景: Windows XP (Bliss) 風の青空ブルーと草原グリーンのアクセント
 * - 表示: 「今日触れる1〜3個（最小接触）」と「直近の絶対期限タスク」のみ
 * - 操作: チェックボックスをタップすると即座に完了して「今日触れた履歴」へ移動
 */
export function KearuTodoWidget({
  todos,
  completedTodayCount,
}: KearuTodoWidgetProps) {
  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: '#2B6CB0',
        borderRadius: 22,
        padding: 14,
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      {/* ヘッダー: 青空の上のタイトルバー */}
      <FlexWidget
        style={{
          width: 'match_parent',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 8,
        }}
        clickAction="OPEN_APP"
      >
        <FlexWidget style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TextWidget
            text="☁️ pochi"
            style={{
              fontSize: 15,
              fontWeight: 'bold',
              color: '#FFFFFF',
            }}
          />
          <TextWidget
            text="  今日の最小接触"
            style={{
              fontSize: 12,
              color: '#E2F1FF',
            }}
          />
        </FlexWidget>

        <FlexWidget
          style={{
            backgroundColor: '#56A818',
            borderRadius: 12,
            paddingHorizontal: 10,
            paddingVertical: 3,
          }}
        >
          <TextWidget
            text={`今日触れた: ${completedTodayCount}`}
            style={{
              fontSize: 11,
              fontWeight: 'bold',
              color: '#FFFFFF',
            }}
          />
        </FlexWidget>
      </FlexWidget>

      {/* メインリスト: 白く透ける清潔なカード */}
      {todos.length === 0 ? (
        <FlexWidget
          style={{
            width: 'match_parent',
            backgroundColor: '#F7FAFC',
            borderRadius: 16,
            padding: 18,
            alignItems: 'center',
            justifyContent: 'center',
          }}
          clickAction="OPEN_APP"
        >
          <TextWidget
            text="🌿 今日触れる項目はすべてクリア！"
            style={{
              fontSize: 14,
              fontWeight: 'bold',
              color: '#276749',
            }}
          />
          <TextWidget
            text="夜はゆっくり脱力して、ケアルに一言だけ残そう"
            style={{
              fontSize: 11,
              color: '#4A5568',
              marginTop: 4,
            }}
          />
        </FlexWidget>
      ) : (
        <ListWidget
          style={{
            height: 'match_parent',
            width: 'match_parent',
          }}
        >
          {todos.map((item) => (
            <FlexWidget
              key={item.id}
              style={{
                width: 'match_parent',
                backgroundColor: '#F8FBFF',
                borderRadius: 14,
                paddingHorizontal: 12,
                paddingVertical: 10,
                marginBottom: 7,
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              {/* 1項目につきチェックボックス1つだけ（タップで完了） */}
              <FlexWidget
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 8,
                  borderWidth: 2,
                  borderColor: '#2B6CB0',
                  backgroundColor: '#FFFFFF',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 10,
                }}
                clickAction="COMPLETE_TODO"
                clickActionData={{ todoId: item.id }}
              >
                <TextWidget
                  text=" "
                  style={{ fontSize: 13, color: '#2B6CB0' }}
                />
              </FlexWidget>

              {/* タスク名 ＋ 1行補足 ＋ 期限バッジ */}
              <FlexWidget
                style={{
                  flex: 1,
                  flexDirection: 'column',
                }}
                clickAction="OPEN_APP"
              >
                <TextWidget
                  text={item.title}
                  style={{
                    fontSize: 14,
                    fontWeight: 'bold',
                    color: '#1A202C',
                  }}
                  maxLines={1}
                />

                <FlexWidget
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginTop: 3,
                  }}
                >
                  {item.requires_submission_check ? (
                    <TextWidget
                      text="【提出・反映まで】 "
                      style={{
                        fontSize: 11,
                        fontWeight: 'bold',
                        color: '#C53030',
                      }}
                    />
                  ) : null}

                  {item.due_date ? (
                    <TextWidget
                      text={`📅 ${item.due_date}  `}
                      style={{
                        fontSize: 11,
                        fontWeight: 'bold',
                        color: '#2B6CB0',
                      }}
                    />
                  ) : null}

                  {item.short_note ? (
                    <TextWidget
                      text={item.short_note}
                      style={{
                        fontSize: 11,
                        color: '#4A5568',
                      }}
                      maxLines={1}
                    />
                  ) : null}
                </FlexWidget>
              </FlexWidget>
            </FlexWidget>
          ))}
        </ListWidget>
      )}
    </FlexWidget>
  );
}
