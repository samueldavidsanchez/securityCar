import { hasRole, type CommandType } from '@securitycar/shared'
import { useState } from 'react'
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Button, Card } from '@/components/ui'
import { EmptyState } from '@/components/EmptyState'
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

  function confirmAndSend(type: CommandType, message: string) {
    Alert.alert('Confirmar acción', message, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Confirmar',
        style: 'destructive',
        onPress: async () => {
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
        },
      },
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
            <Text style={styles.warningText}>
              ⚠️ Estas acciones afectan físicamente al vehículo. Úsalas con cuidado.
            </Text>
          </Card>
        )}

        {canCommand && (
        <Card>
          <View style={{ gap: 12 }}>
            {status?.engine_blocked ? (
              <Button
                label="🟢 Desbloquear motor"
                variant="success"
                loading={pending === 'engine_unblock'}
                onPress={() =>
                  confirmAndSend('engine_unblock', 'Se permitirá que el motor arranque nuevamente.')
                }
              />
            ) : (
              <Button
                label="🔴 Bloquear motor"
                variant="danger"
                loading={pending === 'engine_block'}
                onPress={() =>
                  confirmAndSend('engine_block', 'El motor no podrá arrancar hasta que lo desbloquees.')
                }
              />
            )}
            <Button
              label="📍 Solicitar ubicación"
              variant="primary"
              loading={pending === 'request_location'}
              onPress={() =>
                confirmAndSend('request_location', 'Se pedirá una actualización de ubicación inmediata.')
              }
            />
            <Button
              label="🔄 Reiniciar GPS"
              variant="secondary"
              loading={pending === 'reboot'}
              onPress={() =>
                confirmAndSend('reboot', 'El GPS se reiniciará y estará desconectado unos segundos.')
              }
            />
          </View>
        </Card>
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
  warningText: { color: colors.warning, fontSize: 13 },
  readOnly: { color: colors.textMuted, fontSize: 13 },
})
