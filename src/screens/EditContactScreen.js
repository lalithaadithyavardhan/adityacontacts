import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';

const EditContactScreen = ({ route, navigation }) => {
  const [contact, setContact] = useState(route.params.contact);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });

    if (!result.canceled) {
      setContact({ ...contact, photo: result.assets[0].uri });
    }
  };

  const saveContact = async () => {
    try {
      const stored = await AsyncStorage.getItem('contacts');
      const contacts = stored ? JSON.parse(stored) : [];

      const updated = contacts.map(c =>
        c.id === contact.id ? contact : c
      );

      await AsyncStorage.setItem('contacts', JSON.stringify(updated));
      navigation.goBack();
    } catch {
      Alert.alert('Error', 'Could not save contact');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>

      <TouchableOpacity onPress={pickImage} style={styles.imageBox}>
        {contact.photo ? (
          <Image source={{ uri: contact.photo }} style={styles.image} />
        ) : (
          <Text>Add Photo</Text>
        )}
      </TouchableOpacity>

      <Input label="Name" value={contact.name} onChange={v => setContact({ ...contact, name: v })} />
      <Input label="Title" value={contact.title} onChange={v => setContact({ ...contact, title: v })} />
      <Input label="Office" value={contact.office} onChange={v => setContact({ ...contact, office: v })} />
      <Input label="Phone" value={contact.phone} onChange={v => setContact({ ...contact, phone: v })} />
      <Input label="Email" value={contact.email} onChange={v => setContact({ ...contact, email: v })} />
      <Input label="Address" value={contact.address} onChange={v => setContact({ ...contact, address: v })} />

      <TouchableOpacity style={styles.saveBtn} onPress={saveContact}>
        <Text style={styles.saveText}>Save Changes</Text>
      </TouchableOpacity>

    </ScrollView>
  );
};

const Input = ({ label, value, onChange }) => (
  <View style={styles.inputBox}>
    <Text style={styles.label}>{label}</Text>
    <TextInput value={value} onChangeText={onChange} style={styles.input} />
  </View>
);

const styles = StyleSheet.create({
  container: { padding: 20 },
  imageBox: {
    alignSelf: 'center',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#eee',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  image: { width: 120, height: 120, borderRadius: 60 },

  inputBox: { marginBottom: 15 },
  label: { fontSize: 12, color: '#666' },
  input: {
    borderBottomWidth: 1,
    borderColor: '#ccc',
    paddingVertical: 6,
  },

  saveBtn: {
    backgroundColor: '#F05819',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  saveText: { color: '#fff', fontWeight: 'bold' },
});

export default EditContactScreen;
