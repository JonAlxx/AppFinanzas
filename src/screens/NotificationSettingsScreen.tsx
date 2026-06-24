import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useAppState } from '../state/AppStateContext';
import { useNavigation } from '../navigation/NavigationContext';
import { useTheme } from '../theme/ThemeContext';
import { ScreenHeader } from '../components/ScreenHeader';
import { Card } from '../components/Card';
import { Icon } from '../icons/Icon';
import { softFor, colorFor } from '../theme/theme';
import * as Haptics from 'expo-haptics';

const DAYS_OPTIONS = [1, 2, 3, 5, 7];

interface DigitalTimePickerProps {
  label: string;
  sublabel: string;
  hour: number;
  minute: number;
  onChange: (h: number, m: number) => void;
  accentColor: string;
}

function DigitalTimePicker({ label, sublabel, hour, minute, onChange, accentColor }: DigitalTimePickerProps) {
  const { t } = useTheme();
  
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  const isPM = hour >= 12;
  const displayMinute = String(minute).padStart(2, '0');

  const triggerHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  };

  const adjustHour = (direction: 'up' | 'down') => {
    triggerHaptic();
    let next12Hour = displayHour;
    if (direction === 'up') {
      next12Hour = displayHour === 12 ? 1 : displayHour + 1;
    } else {
      next12Hour = displayHour === 1 ? 12 : displayHour - 1;
    }
    
    // Convert back to 24h
    let next24Hour = next12Hour;
    if (isPM) {
      next24Hour = next12Hour === 12 ? 12 : next12Hour + 12;
    } else {
      next24Hour = next12Hour === 12 ? 0 : next12Hour;
    }
    onChange(next24Hour, minute);
  };

  const adjustMinute = (direction: 'up' | 'down') => {
    triggerHaptic();
    let nextMinute = minute;
    if (direction === 'up') {
      nextMinute = (minute + 5) % 60;
    } else {
      nextMinute = (minute - 5 + 60) % 60;
    }
    onChange(hour, nextMinute);
  };

  const toggleAmPm = () => {
    triggerHaptic();
    let next24Hour = hour;
    if (isPM) {
      // PM to AM
      next24Hour = hour === 12 ? 0 : hour - 12;
    } else {
      // AM to PM
      next24Hour = hour === 0 ? 12 : hour + 12;
    }
    onChange(next24Hour, minute);
  };

  return (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: t.surfaceAlt,
      borderRadius: 22,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderWidth: 1,
      borderColor: t.border,
      width: '100%',
    }}>
      {/* Left side: Labels */}
      <View style={{ flex: 1, marginRight: 8 }}>
        <Text style={{
          fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 14, color: t.text,
        }}>
          {label}
        </Text>
        <Text style={{
          fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 11, color: t.textMuted,
          marginTop: 2,
        }}>
          {sublabel}
        </Text>
      </View>

      {/* Right side: Sleek Adjuster */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        
        {/* Hour block with vertical buttons */}
        <View style={{ alignItems: 'center' }}>
          <Pressable onPress={() => adjustHour('up')} style={{ padding: 2 }}>
            <Icon name="chevron-up" size={14} color={t.textMuted} strokeWidth={3.5} />
          </Pressable>
          <View style={{
            backgroundColor: t.surface,
            width: 40, height: 40, borderRadius: 12,
            alignItems: 'center', justifyContent: 'center',
            borderWidth: 1, borderColor: t.border,
          }}>
            <Text style={{
              fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 16, color: t.text,
            }}>
              {String(displayHour).padStart(2, '0')}
            </Text>
          </View>
          <Pressable onPress={() => adjustHour('down')} style={{ padding: 2 }}>
            <Icon name="chevron-down" size={14} color={t.textMuted} strokeWidth={3.5} />
          </Pressable>
        </View>

        {/* Pulsing Colon */}
        <Text style={{
          fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 16, color: t.textMuted,
          paddingHorizontal: 1, marginTop: -4,
        }}>
          :
        </Text>

        {/* Minute block with vertical buttons */}
        <View style={{ alignItems: 'center' }}>
          <Pressable onPress={() => adjustMinute('up')} style={{ padding: 2 }}>
            <Icon name="chevron-up" size={14} color={t.textMuted} strokeWidth={3.5} />
          </Pressable>
          <View style={{
            backgroundColor: t.surface,
            width: 40, height: 40, borderRadius: 12,
            alignItems: 'center', justifyContent: 'center',
            borderWidth: 1, borderColor: t.border,
          }}>
            <Text style={{
              fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 16, color: t.text,
            }}>
              {displayMinute}
            </Text>
          </View>
          <Pressable onPress={() => adjustMinute('down')} style={{ padding: 2 }}>
            <Icon name="chevron-down" size={14} color={t.textMuted} strokeWidth={3.5} />
          </Pressable>
        </View>

        {/* AM / PM Selector Pill */}
        <Pressable
          onPress={toggleAmPm}
          style={{
            backgroundColor: softFor(t, accentColor),
            paddingHorizontal: 10, paddingVertical: 10, borderRadius: 12,
            marginLeft: 6, borderWidth: 1, borderColor: colorFor(t, accentColor) + '15',
            minWidth: 42, alignItems: 'center', justifyContent: 'center',
            height: 40, marginTop: 10, // Align vertically with the center boxes
          }}
        >
          <Text style={{
            fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 12,
            color: colorFor(t, accentColor),
          }}>
            {isPM ? 'PM' : 'AM'}
          </Text>
        </Pressable>

      </View>
    </View>
  );
}

export function NotificationSettingsScreen() {
  const { t } = useTheme();
  const { state, dispatch } = useAppState();
  const { back } = useNavigation();

  const pushEnabled = state.pushNotificationsEnabled ?? true;
  const daysBefore = state.notificationDaysBefore ?? 3;
  const hour = state.notificationHour ?? 9;
  const minute = state.notificationMinute ?? 0;
  const hour2 = state.notificationHour2 ?? 21;
  const minute2 = state.notificationMinute2 ?? 0;
  const frequency = state.notificationFrequency ?? 'twice';

  const triggerHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  };

  const updateSettings = (newDays: number, newHour: number, newMin: number, newHour2: number, newMin2: number, newFreq: string) => {
    dispatch({
      type: 'UPDATE_NOTIFICATION_SETTINGS',
      daysBefore: newDays,
      hour: newHour,
      minute: newMin,
      hour2: newHour2,
      minute2: newMin2,
      frequency: newFreq,
    });
  };

  const togglePush = () => {
    triggerHaptic();
    dispatch({ type: 'TOGGLE_PUSH_NOTIFICATIONS' });
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScreenHeader title="Notificaciones" subtitle="Configurar" leftIcon="chevron-left" onLeft={back} rightIcon={null} />
      
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Toggle Switch Card */}
        <Card style={{ marginBottom: 16, padding: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1, marginRight: 16 }}>
              <Text style={{
                fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 16, color: t.text,
              }}>
                Alertas en el Celular
              </Text>
              <Text style={{
                fontFamily: 'PlusJakartaSans_500Medium', fontSize: 12, color: t.textMuted,
                marginTop: 4, lineHeight: 16,
              }}>
                Recibe avisos antes del vencimiento de tus movimientos recurrentes.
              </Text>
            </View>
            <Pressable
              onPress={togglePush}
              style={{
                width: 46, height: 26, borderRadius: 13,
                backgroundColor: pushEnabled ? t.indigo : t.border,
                position: 'relative',
              }}
            >
              <View style={{
                position: 'absolute', top: 3, left: pushEnabled ? 23 : 3,
                width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff',
                shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.2, shadowRadius: 3, elevation: 2,
              }} />
            </Pressable>
          </View>
        </Card>

        {pushEnabled ? (
          <View style={{ gap: 16 }}>
            {/* Days in Advance Selection */}
            <Card style={{ padding: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <View style={{
                  width: 28, height: 28, borderRadius: 8, backgroundColor: softFor(t, 'indigo'),
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon name="calendar" size={14} color={colorFor(t, 'indigo')} />
                </View>
                <Text style={{
                  fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, color: t.text,
                  flex: 1,
                }}>
                  ¿Con cuántos días de anticipación?
                </Text>
              </View>
              <Text style={{
                fontFamily: 'PlusJakartaSans_500Medium', fontSize: 12, color: t.textMuted,
                marginBottom: 14, lineHeight: 16,
              }}>
                Te avisaremos sobre tus pagos e ingresos programados antes de la fecha límite.
              </Text>
              
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {DAYS_OPTIONS.map(d => {
                  const selected = daysBefore === d;
                  return (
                    <Pressable
                      key={d}
                      onPress={() => {
                        triggerHaptic();
                        updateSettings(d, hour, minute, hour2, minute2, frequency);
                      }}
                      style={{
                        paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12,
                        backgroundColor: selected ? t.indigo : t.surfaceAlt,
                        borderWidth: 1, borderColor: selected ? t.indigo : t.border,
                      }}
                    >
                      <Text style={{
                        fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13,
                        color: selected ? '#fff' : t.text,
                      }}>
                        {d} {d === 1 ? 'día' : 'días'} antes
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </Card>

            {/* Frequency Selection */}
            <Card style={{ padding: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <View style={{
                  width: 28, height: 28, borderRadius: 8, backgroundColor: softFor(t, 'orange'),
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon name="bell" size={14} color={colorFor(t, 'orange')} />
                </View>
                <Text style={{
                  fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, color: t.text,
                  flex: 1,
                }}>
                  Frecuencia diaria de avisos
                </Text>
              </View>
              
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Pressable
                  onPress={() => {
                    triggerHaptic();
                    updateSettings(daysBefore, hour, minute, hour2, minute2, 'once');
                  }}
                  style={{
                    flex: 1, padding: 14, borderRadius: 16,
                    backgroundColor: frequency === 'once' ? softFor(t, 'indigo') : t.surfaceAlt,
                    borderWidth: 1, borderColor: frequency === 'once' ? t.indigo : t.border,
                    alignItems: 'center', gap: 4,
                  }}
                >
                  <Text style={{
                    fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14,
                    color: frequency === 'once' ? t.indigo : t.text,
                  }}>
                    1 vez al día
                  </Text>
                  <Text style={{
                    fontFamily: 'PlusJakartaSans_500Medium', fontSize: 11, color: t.textMuted,
                    textAlign: 'center',
                  }}>
                    Un único horario personalizado
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => {
                    triggerHaptic();
                    updateSettings(daysBefore, hour, minute, hour2, minute2, 'twice');
                  }}
                  style={{
                    flex: 1, padding: 14, borderRadius: 16,
                    backgroundColor: frequency === 'twice' ? softFor(t, 'indigo') : t.surfaceAlt,
                    borderWidth: 1, borderColor: frequency === 'twice' ? t.indigo : t.border,
                    alignItems: 'center', gap: 4,
                  }}
                >
                  <Text style={{
                    fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14,
                    color: frequency === 'twice' ? t.indigo : t.text,
                  }}>
                    2 veces al día
                  </Text>
                  <Text style={{
                    fontFamily: 'PlusJakartaSans_500Medium', fontSize: 11, color: t.textMuted,
                    textAlign: 'center',
                  }}>
                    Dos horarios independientes
                  </Text>
                </Pressable>
              </View>
            </Card>

            {/* Time Selection Card */}
            <Card style={{ padding: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <View style={{
                  width: 28, height: 28, borderRadius: 8, backgroundColor: softFor(t, 'green'),
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon name="calculator" size={14} color={colorFor(t, 'green')} />
                </View>
                <Text style={{
                  fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, color: t.text,
                  flex: 1,
                }}>
                  Ajustar horario de alertas
                </Text>
              </View>
              
              <Text style={{
                fontFamily: 'PlusJakartaSans_500Medium', fontSize: 12, color: t.textMuted,
                marginBottom: 16, lineHeight: 16,
              }}>
                {frequency === 'once'
                  ? 'Fija la hora en la que se disparará el aviso en tu celular.'
                  : 'Fija los dos horarios en los que se dispararán los avisos del día.'}
              </Text>

              <View style={{ gap: 12 }}>
                {frequency === 'once' ? (
                  <DigitalTimePicker
                    label="Horario único"
                    sublabel="Disparo diario"
                    hour={hour}
                    minute={minute}
                    accentColor="indigo"
                    onChange={(h, m) => updateSettings(daysBefore, h, m, hour2, minute2, frequency)}
                  />
                ) : (
                  <>
                    <DigitalTimePicker
                      label="Primer aviso"
                      sublabel="Turno matutino"
                      hour={hour}
                      minute={minute}
                      accentColor="indigo"
                      onChange={(h, m) => updateSettings(daysBefore, h, m, hour2, minute2, frequency)}
                    />
                    <DigitalTimePicker
                      label="Segundo aviso"
                      sublabel="Turno vespertino"
                      hour={hour2}
                      minute={minute2}
                      accentColor="violet"
                      onChange={(h, m) => updateSettings(daysBefore, hour, minute, h, m, frequency)}
                    />
                  </>
                )}
              </View>
            </Card>

            {/* Save Status Banner */}
            <View style={{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
              marginTop: 4,
            }}>
              <Icon name="check" size={14} color={t.green} strokeWidth={3} />
              <Text style={{
                fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 12, color: t.textMuted,
              }}>
                Los cambios se guardan y aplican de forma inmediata.
              </Text>
            </View>
          </View>
        ) : (
          <View style={{
            alignItems: 'center', justifyContent: 'center', padding: 40,
            opacity: 0.6,
          }}>
            <View style={{
              width: 60, height: 60, borderRadius: 20, backgroundColor: t.border,
              alignItems: 'center', justifyContent: 'center', marginBottom: 12,
            }}>
              <Icon name="bell" size={24} color={t.textMuted} />
            </View>
            <Text style={{
              fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, color: t.textMuted,
              textAlign: 'center',
            }}>
              Notificaciones desactivadas
            </Text>
            <Text style={{
              fontFamily: 'PlusJakartaSans_500Medium', fontSize: 12, color: t.textMuted,
              textAlign: 'center', marginTop: 4, lineHeight: 16,
            }}>
              Activa el interruptor principal de arriba para poder personalizar tus avisos.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
