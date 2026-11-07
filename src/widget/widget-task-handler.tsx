import React from 'react';
import {
  WidgetTaskHandlerProps,
  requestWidgetUpdate,
} from 'react-native-android-widget';
import { KearuTodoWidget } from './KearuTodoWidget';
import {
  fetchTodos,
  markTodoDone,
  selectTodayWidgetTodos,
} from '../supabase';
import { TodoItem } from '../types';

function countCompletedToday(items: TodoItem[]): number {
  const todayPrefix = new Date().toISOString().slice(0, 10);
  return items.filter(
    (item) =>
      item.status === 'done' &&
      item.completed_at &&
      item.completed_at.startsWith(todayPrefix)
  ).length;
}

export async function refreshAndroidWidget(items?: TodoItem[]) {
  try {
    const allTodos = items || (await fetchTodos());
    const todayTodos = selectTodayWidgetTodos(allTodos);
    const completedTodayCount = countCompletedToday(allTodos);

    await requestWidgetUpdate({
      widgetName: 'KearuTodoWidget',
      renderWidget: () => (
        <KearuTodoWidget
          todos={todayTodos}
          completedTodayCount={completedTodayCount}
        />
      ),
    });
  } catch {
    // Web / iOS preview 環境などウィジェット非対応環境では無視
  }
}

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED': {
      const allTodos = await fetchTodos();
      const todayTodos = selectTodayWidgetTodos(allTodos);
      props.renderWidget(
        <KearuTodoWidget
          todos={todayTodos}
          completedTodayCount={countCompletedToday(allTodos)}
        />
      );
      break;
    }

    case 'WIDGET_CLICK': {
      if (props.clickAction === 'COMPLETE_TODO') {
        const todoId = props.clickActionData?.todoId as string | undefined;
        if (todoId) {
          const updated = await markTodoDone(todoId);
          const todayTodos = selectTodayWidgetTodos(updated);
          props.renderWidget(
            <KearuTodoWidget
              todos={todayTodos}
              completedTodayCount={countCompletedToday(updated)}
            />
          );
        }
      }
      break;
    }

    default:
      break;
  }
}
