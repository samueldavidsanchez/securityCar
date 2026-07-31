import { hasRole, type CommandType } from '@securitycar/shared'
import { Lock, Navigation, RefreshCw, TriangleAlert, Unlock } from 'lucide-react-native'
import { useState } from 'react'
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Button, Card } from '@/components/ui'
import { EmptyState } from '@/components/EmptyState'
import { SlideToConfirm } from '@/components/SlideToConfirm'
import { VehiclePills } from '@/components/VehiclePills'
import { useVehicleContext } from '@/context/VehicleContext'
import { useVehicleStatus } from '@/hooks/useVehicles'
import { api } from '@/lib/api'
import { colors } from '@/theme/colors'

export default function Security() {
  const { selected } = useVehicleContext()
  const { status } = useVehicleStatus(selected?.id ?? null)
  const [pending, setPending] = useState<CommandType | null>(null)

  if (!selected) return <EmptyState />

  // El servidor rechaza los comandos de un 'viewer' (403) y la política de
  // command_logs también: esto solo evita ofrecer un botón que va a fallar.
  const canCommand = hasRole(selected.effective_role, 'driver')

  async function sendCommand(type: CommandType) {
    setPending(type)
    try {
      await api(`/api/vehicles/${selected!.id}/commands`, {
        method: 'POST',
        body: JSON.stringify({ type }),
      })
      Alert.alert('Listo', 'Comando enviado correctamente.')
    } catch {
      Alert.alert('Error', 'No se pudo enviar el comando.')
    } finally {
      setPending(null)
    }
  }

  function confirmAndSend(type: CommandType, message: string) {
    Alert.alert('Confirmar acción', message, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Confirmar', style: 'destructive', onPress: () => sendCommand(type) },
    ])
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <VehiclePills />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Seguridad</Text>
        <Text style={styles.subtitle}>{selected.alias}</Text>

        {!canCommand && (
          <Card>
            <Text style={styles.readOnly}>
              Tienes acceso de solo lectura a este vehículo. Pide al propietario que te
              asigne el rol de conductor para poder enviar comandos.
            </Text>
          </Card>
        )}

        {canCommand && (
          <Card style={styles.warning}>
            <View style={styles.warningRow}>
              <TriangleAlert size={16} color={colors.warning} />
              <Text style={styles.warningText}>
                Estas acciones afectan físicamente al vehículo. Úsalas con cuidado.
              </Text>
            </View>
          </Card>
        )}

        {canCommand && (
          <>
            <Card>
              <View style={{ gap: 6 }}>
                <Text style={styles.sectionLabel}>Motor: {status?.engine_blocked ? 'bloqueado' : 'normal'}</Text>
                {status?.engine_blocked ? (
                  <SlideToConfirm
                    label="Desbloquear motor"
                    icon={Unlock}
                    variant="success"
                    loading={pending === 'engine_unblock'}
                    onConfirm={() => sendCommand('engine_unblock')}
                  />
                ) : (
                  <SlideToConfirm
                    label="Bloquear motor"
                    icon={Lock}
                    variant="danger"
                    loading={pending === 'engine_block'}
                    onConfirm={() => sendCommand('engine_block')}
                  />
                )}
              </View>
            </Card>

            <Card>
              <View style={{ gap: 12 }}>
                <Button
                  label="Solicitar ubicación"
                  icon={Navigation}
                  variant="primary"
                  loading={pending === 'request_location'}
                  onPress={() =>
                    confirmAndSend('request_location', 'Se pedirá una actualización de ubicación inmediata.')
                  }
                />
                <Button
                  label="Reiniciar GPS"
                  icon={RefreshCw}
                  variant="secondary"
                  loading={pending === 'reboot'}
                  onPress={() =>
                    confirmAndSend('reboot', 'El GPS se reiniciará y estará desconectado unos segundos.')
                  }
                />
              </View>
            </Card>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgBase },
  content: { padding: 16, gap: 12 },
  title: { fontSize: 20, fontWeight: '700', color: colors.textPrimary },
  subtitle: { color: colors.textMuted, marginTop: -6 },
  warning: { backgroundColor: colors.warning + '14', borderColor: colors.warning + '55' },
  warningRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  warningText: { flex: 1, color: colors.warning, fontSize: 13 },
  readOnly: { color: colors.textMuted, fontSize: 13 },
  sectionLabel: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
})
