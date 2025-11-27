import React, { useState } from 'react'
import { Modal, View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native'
import { useLanguage } from '../lib/LanguageContext'
import colors from '../lib/colors'

type Props = {
  triggerStyle?: any
  textStyle?: any
}

export default function LanguageSelector({ triggerStyle, textStyle }: Props) {
  const { languages, setLanguage, language, t } = useLanguage()
  const [open, setOpen] = useState(false)

  return (
    <>
      <TouchableOpacity style={[styles.trigger, triggerStyle]} onPress={() => setOpen(true)}>
        <Text style={[styles.triggerText, textStyle]}>{t('auth.changeLanguage')}</Text>
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <Text style={styles.title}>{t('settings.language')}</Text>
            <FlatList
              data={languages}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.item, item.code === language && styles.itemActive]}
                  onPress={() => {
                    setLanguage(item.code)
                    setOpen(false)
                  }}
                >
                  <Text style={styles.itemText}>{item.name}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={styles.close} onPress={() => setOpen(false)}>
              <Text style={styles.closeText}>{t('common.close')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  trigger: { paddingHorizontal: 12, paddingVertical: 8 },
  triggerText: { color: colors.primary, fontWeight: '600' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  sheet: { width: '85%', borderRadius: 12, backgroundColor: '#fff', padding: 16 },
  title: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  item: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8 },
  itemActive: { backgroundColor: '#f0f4ff' },
  itemText: { fontSize: 15 },
  close: { marginTop: 12, alignSelf: 'flex-end' },
  closeText: { color: colors.primary, fontWeight: '600' }
})
