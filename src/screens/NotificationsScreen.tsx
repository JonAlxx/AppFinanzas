import React, { useEffect } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { dayLabel, fmtTime } from '../data/format';
import { NotificationType } from '../data/types';
import { useAppState } from '../state/AppStateContext';
import { useNavigation } from '../navigation/NavigationContext';
import { useTheme } from '../theme/ThemeContext';
import { colorFor, softFor } from '../theme/theme';

import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { ScreenHeader } from '../components/ScreenHeader';
import { Icon, IconName } from '../icons/Icon';

const ICON_MAP: Record<NotificationType, IconName> = {
  budget: 'bolt',
  goal: 'target',
  income: 'arrow-down',
  tip: 'lightbulb',
};

export function NotificationsScreen() {
  const { t } = useTheme();
  const { state, dispatch } = useAppState();
  const { back } = useNavigation();

  useEffect(() => {
    const timer = setTimeout(() => dispatch({ type: 'MARK_ALL_READ' }), 1500);
    return () => clearTimeout(timer);
  }, [dispatch]);

  return (
    <View style={{ flex: 1 }}>
      <ScreenHeader
        leftIcon="chevron-left"
        onLeft={back}
        title="Notificaciones"
        rightIcon="check"
        onRight={() => dispatch({ type: 'MARK_ALL_READ' })}
      />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {state.notifications.length === 0 ? (
          <EmptyState
            icon="bell"
            title="Todo tranquilo por aquí"
            message="Te avisaremos de alertas, metas y movimientos importantes."
          />
        ) : (
          <View style={{ gap: 10 }}>
            {state.notifications.map(n => {
              const c = colorFor(t, n.accent);
              const soft = softFor(t, n.accent);
              const label = dayLabel(n.date);
              const stamp = label === 'Hoy' ? fmtTime(n.date) : label;
              return (
                <Card key={n.id} style={{ paddingLeft: 22, position: 'relative' }}>
                  {!n.read ? (
                    <View style={{
                      position: 'absolute', top: 22, left: 10,
                      width: 6, height: 6, borderRadius: 3, backgroundColor: t.indigo,
                    }} />
                  ) : null}
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <View style={{
                      width: 42, height: 42, borderRadius: 13, backgroundColor: soft,
                      alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <Icon name={ICON_MAP[n.type] || 'bell'} size={20} color={c} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                        <Text style={{
                          flex: 1,
                          fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 14, color: t.text,
                          letterSpacing: -0.2,
                        }}>{n.title}</Text>
                        <Text style={{
                          fontFamily: 'PlusJakartaSans_500Medium', fontSize: 11, color: t.textMuted,
                          flexShrink: 0,
                        }}>{stamp}</Text>
                      </View>
                      <Text style={{
                        fontFamily: 'PlusJakartaSans_500Medium', fontSize: 13, color: t.textMuted,
                        marginTop: 4, lineHeight: 18,
                      }}>{n.body}</Text>
                    </View>
                  </View>
                </Card>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
