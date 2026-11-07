import React, { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlissBackground } from '../components/BlissBackground';
import { ActiveTab, TodoItem } from '../types';
import {
  fetchTodos,
  createTodoItem,
  markTodoDone,
  reopenTodo,
  toggleTodoToday,
  selectTodayWidgetTodos,
  isSupabaseConfigured,
  supabase,
} from '../supabase';
import { refreshAndroidWidget } from '../widget/widget-task-handler';

export const TodoMainScreen: React.FC = () => {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [activeTab, setActiveTab] = useState<ActiveTab>('today');

  // 下部「1秒追加バー」の入力状態
  const [quickTitle, setQuickTitle] = useState('');
  const [quickShortNote, setQuickShortNote] = useState('');
  const [quickDueDate, setQuickDueDate] = useState('');
  const [quickSubmissionCheck, setQuickSubmissionCheck] = useState(false);
  const [showOptions, setShowOptions] = useState(false);

  const loadData = useCallback(async () => {
    const data = await fetchTodos();
    setTodos(data);
    await refreshAndroidWidget(data);
  }, []);

  useEffect(() => {
    loadData();

    // Supabase Realtime購読（夜のケアル対話から追加された瞬間に画面・ウィジェットを更新）
    if (supabase) {
      const channel = supabase
        .channel('public:todos')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'todos' },
          () => {
            loadData();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [loadData]);

  const handleQuickAdd = async () => {
    if (!quickTitle.trim()) return;
    const isAddingToToday = activeTab !== 'backlog';
    const next = await createTodoItem({
      title: quickTitle,
      short_note: quickShortNote,
      requires_submission_check: quickSubmissionCheck,
      is_today: isAddingToToday,
      due_date: quickDueDate.trim() || null,
    });
    setTodos(next);
    setQuickTitle('');
    setQuickShortNote('');
    setQuickDueDate('');
    setQuickSubmissionCheck(false);
    setShowOptions(false);
    await refreshAndroidWidget(next);
  };

  const handleComplete = async (id: string) => {
    const next = await markTodoDone(id);
    setTodos(next);
    await refreshAndroidWidget(next);
  };

  const handleReopen = async (id: string) => {
    const next = await reopenTodo(id);
    setTodos(next);
    await refreshAndroidWidget(next);
  };

  const handleToggleToday = async (id: string, nextToday: boolean) => {
    const next = await toggleTodoToday(id, nextToday);
    setTodos(next);
    await refreshAndroidWidget(next);
  };

  const todayList = selectTodayWidgetTodos(todos);
  const todayIds = new Set(todayList.map((t) => t.id));
  const backlogList = todos.filter(
    (t) => t.status === 'todo' && !todayIds.has(t.id)
  );
  const doneList = todos
    .filter((t) => t.status === 'done')
    .sort((a, b) => (b.completed_at || '').localeCompare(a.completed_at || ''));

  return (
    <BlissBackground>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.flex1}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* ヘッダー（Windows XP の爽やかな青空に浮かぶタイトルバー） */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>☁️ pochi</Text>
              <Text style={styles.headerSub}>
                スピードではなくベクトル。今日触れる1〜3個だけ
              </Text>
            </View>
            <View style={styles.syncBadge}>
              <Text style={styles.syncBadgeText}>
                {isSupabaseConfigured ? '🟢 Supabase同期中' : '🌿 ローカル動作中'}
              </Text>
            </View>
          </View>

          {/* 3タブ切り替え（今日 / 控え / 軌跡） */}
          <View style={styles.tabBar}>
            <TouchableOpacity
              style={[
                styles.tabButton,
                activeTab === 'today' && styles.tabButtonActive,
              ]}
              onPress={() => setActiveTab('today')}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === 'today' && styles.tabTextActive,
                ]}
              >
                ☀️ 今日 ({todayList.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tabButton,
                activeTab === 'backlog' && styles.tabButtonActive,
              ]}
              onPress={() => setActiveTab('backlog')}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === 'backlog' && styles.tabTextActive,
                ]}
              >
                🌱 控え ({backlogList.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tabButton,
                activeTab === 'done' && styles.tabButtonActive,
              ]}
              onPress={() => setActiveTab('done')}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === 'done' && styles.tabTextActive,
                ]}
              >
                ✨ 軌跡 ({doneList.length})
              </Text>
            </TouchableOpacity>
          </View>

          {/* メインカード一覧（白く透ける清潔なカード） */}
          <ScrollView
            style={styles.listContainer}
            contentContainerStyle={styles.listContent}
          >
            {activeTab === 'today' && (
              <>
                <View style={styles.sectionBanner}>
                  <Text style={styles.sectionBannerText}>
                    📱 Androidホーム画面ウィジェットにそのまま表示される項目です
                  </Text>
                </View>

                {todayList.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <Text style={styles.emptyTitle}>
                      🌿 今日の最小接触はすべてクリア！
                    </Text>
                    <Text style={styles.emptySub}>
                      青空と草原を眺めてゆっくり脱力しよう。夜はケアルに1行だけ今日を置けば十分です。
                    </Text>
                  </View>
                ) : (
                  todayList.map((item) => (
                    <View key={item.id} style={styles.todoCard}>
                      {/* 1項目につきチェックボックス1つだけ */}
                      <TouchableOpacity
                        style={styles.checkbox}
                        onPress={() => handleComplete(item.id)}
                      />

                      <View style={styles.cardBody}>
                        <Text style={styles.todoTitle}>{item.title}</Text>

                        {/* 1行の超短い補足 ＋ 目印バッジ */}
                        <View style={styles.metaRow}>
                          {item.requires_submission_check && (
                            <View style={styles.submissionBadge}>
                              <Text style={styles.submissionBadgeText}>
                                提出・反映確認まで
                              </Text>
                            </View>
                          )}

                          {item.due_date && (
                            <View style={styles.dueBadge}>
                              <Text style={styles.dueBadgeText}>
                                📅 期限 {item.due_date}
                              </Text>
                            </View>
                          )}

                          {item.source === 'kearu' && (
                            <View style={styles.kearuBadge}>
                              <Text style={styles.kearuBadgeText}>ケアル対話</Text>
                            </View>
                          )}
                        </View>

                        {Boolean(item.short_note) && (
                          <Text style={styles.shortNoteText} numberOfLines={1}>
                            {item.short_note}
                          </Text>
                        )}
                      </View>

                      {/* 控えへ戻すボタン（遅延警告は出さずワンタップで控えへ逃がせる） */}
                      <TouchableOpacity
                        style={styles.moveActionBtn}
                        onPress={() => handleToggleToday(item.id, false)}
                      >
                        <Text style={styles.moveActionText}>控えへ</Text>
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </>
            )}

            {activeTab === 'backlog' && (
              <>
                <View style={styles.sectionBanner}>
                  <Text style={styles.sectionBannerText}>
                    🌱 今すぐやらなくていい候補。今日触りたくなったら「今日へ」をタップ
                  </Text>
                </View>

                {backlogList.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <Text style={styles.emptyTitle}>控えの項目はありません</Text>
                  </View>
                ) : (
                  backlogList.map((item) => (
                    <View key={item.id} style={styles.todoCard}>
                      <TouchableOpacity
                        style={styles.checkbox}
                        onPress={() => handleComplete(item.id)}
                      />

                      <View style={styles.cardBody}>
                        <Text style={styles.todoTitle}>{item.title}</Text>

                        <View style={styles.metaRow}>
                          {item.requires_submission_check && (
                            <View style={styles.submissionBadge}>
                              <Text style={styles.submissionBadgeText}>
                                提出・反映確認まで
                              </Text>
                            </View>
                          )}
                          {item.due_date && (
                            <View style={styles.dueBadge}>
                              <Text style={styles.dueBadgeText}>
                                📅 {item.due_date}
                              </Text>
                            </View>
                          )}
                        </View>

                        {Boolean(item.short_note) && (
                          <Text style={styles.shortNoteText} numberOfLines={1}>
                            {item.short_note}
                          </Text>
                        )}
                      </View>

                      <TouchableOpacity
                        style={[styles.moveActionBtn, styles.promoteActionBtn]}
                        onPress={() => handleToggleToday(item.id, true)}
                      >
                        <Text style={styles.promoteActionText}>☀️ 今日へ</Text>
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </>
            )}

            {activeTab === 'done' && (
              <>
                <View style={styles.sectionBanner}>
                  <Text style={styles.sectionBannerText}>
                    ✨ あなたが触れて前に進めた軌跡（ベクトル）
                  </Text>
                </View>

                {doneList.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <Text style={styles.emptyTitle}>
                      まだ完了した履歴はありません
                    </Text>
                  </View>
                ) : (
                  doneList.map((item) => (
                    <View
                      key={item.id}
                      style={[styles.todoCard, styles.doneCard]}
                    >
                      <TouchableOpacity
                        style={[styles.checkbox, styles.checkboxChecked]}
                        onPress={() => handleReopen(item.id)}
                      >
                        <Text style={styles.checkMark}>✓</Text>
                      </TouchableOpacity>

                      <View style={styles.cardBody}>
                        <Text style={styles.doneTitle}>{item.title}</Text>
                        <Text style={styles.doneTimestamp}>
                          触れた日:{' '}
                          {item.completed_at
                            ? item.completed_at.slice(0, 10)
                            : '今日'}
                          {item.short_note ? ` ｜ ${item.short_note}` : ''}
                        </Text>
                      </View>
                    </View>
                  ))
                )}
              </>
            )}
          </ScrollView>

          {/* 画面下部：1秒追加バー（長文メモなし、必要なら1行補足と期限だけ添えられる） */}
          <View style={styles.quickAddContainer}>
            {showOptions && (
              <View style={styles.optionsPanel}>
                <TextInput
                  style={styles.optionInput}
                  placeholder="1行補足（例: 最小: 1問だけ見る）"
                  placeholderTextColor="#64748B"
                  value={quickShortNote}
                  onChangeText={setQuickShortNote}
                />
                <View style={styles.optionRow}>
                  <TextInput
                    style={[styles.optionInput, styles.dueInput]}
                    placeholder="期限 YYYY-MM-DD（任意）"
                    placeholderTextColor="#64748B"
                    value={quickDueDate}
                    onChangeText={setQuickDueDate}
                  />
                  <TouchableOpacity
                    style={[
                      styles.submissionToggle,
                      quickSubmissionCheck && styles.submissionToggleActive,
                    ]}
                    onPress={() => setQuickSubmissionCheck(!quickSubmissionCheck)}
                  >
                    <Text
                      style={[
                        styles.submissionToggleText,
                        quickSubmissionCheck &&
                          styles.submissionToggleTextActive,
                      ]}
                    >
                      {quickSubmissionCheck ? '✓ 提出確認あり' : '＋提出確認'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <View style={styles.quickBarRow}>
              <TouchableOpacity
                style={styles.optionExpandBtn}
                onPress={() => setShowOptions(!showOptions)}
              >
                <Text style={styles.optionExpandText}>
                  {showOptions ? '▲' : '1行補足'}
                </Text>
              </TouchableOpacity>

              <TextInput
                style={styles.quickInput}
                placeholder={
                  activeTab === 'backlog'
                    ? '控えに1秒で追加...'
                    : '今日触れることに1秒で追加...'
                }
                placeholderTextColor="#64748B"
                value={quickTitle}
                onChangeText={setQuickTitle}
                onSubmitEditing={handleQuickAdd}
                returnKeyType="done"
              />

              <TouchableOpacity
                style={styles.addBtn}
                onPress={handleQuickAdd}
              >
                <Text style={styles.addBtnText}>追加</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </BlissBackground>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  flex1: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    textShadowColor: 'rgba(15, 35, 80, 0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  headerSub: {
    fontSize: 12,
    color: '#EFF6FF',
    marginTop: 2,
  },
  syncBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.24)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.45)',
  },
  syncBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginVertical: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
    borderRadius: 16,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 12,
    alignItems: 'center',
  },
  tabButtonActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  tabTextActive: {
    color: '#1E40AF',
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  listContent: {
    paddingBottom: 24,
  },
  sectionBanner: {
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginBottom: 10,
  },
  sectionBannerText: {
    fontSize: 12,
    color: '#1E3A8A',
    fontWeight: '600',
  },
  todoCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.98)',
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  doneCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.78)',
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 2.2,
    borderColor: '#2563EB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxChecked: {
    backgroundColor: '#4D9E14',
    borderColor: '#4D9E14',
  },
  checkMark: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
  cardBody: {
    flex: 1,
  },
  todoTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 20,
  },
  doneTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    textDecorationLine: 'line-through',
  },
  doneTimestamp: {
    fontSize: 11,
    color: '#475569',
    marginTop: 3,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 5,
  },
  submissionBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  submissionBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B91C1C',
  },
  dueBadge: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  dueBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  kearuBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  kearuBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },
  shortNoteText: {
    fontSize: 12,
    color: '#475569',
    marginTop: 4,
  },
  moveActionBtn: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    marginLeft: 8,
  },
  moveActionText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  promoteActionBtn: {
    backgroundColor: '#DBEAFE',
  },
  promoteActionText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  emptyCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    borderRadius: 18,
    padding: 22,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  emptySub: {
    fontSize: 12,
    color: '#475569',
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 18,
  },
  quickAddContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    marginHorizontal: 12,
    marginBottom: 10,
    borderRadius: 20,
    padding: 10,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  optionsPanel: {
    marginBottom: 8,
    gap: 6,
  },
  optionInput: {
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0F172A',
  },
  optionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dueInput: {
    flex: 1,
  },
  submissionToggle: {
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  submissionToggleActive: {
    backgroundColor: '#FEE2E2',
  },
  submissionToggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  submissionToggleTextActive: {
    color: '#B91C1C',
  },
  quickBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  optionExpandBtn: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 12,
  },
  optionExpandText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0369A1',
  },
  quickInput: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  addBtn: {
    backgroundColor: '#4D9E14',
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 12,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
});
