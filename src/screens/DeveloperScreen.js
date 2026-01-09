import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, 
  TextInput, Modal, StatusBar, FlatList, KeyboardAvoidingView, Platform, 
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as Clipboard from 'expo-clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WebView } from 'react-native-webview'; // <--- NEW IMPORT

import { FileSystemService } from '../utils/FileSystemService';

const DeveloperScreen = ({ navigation }) => {
  // --- STATE ---
  const [activeTab, setActiveTab] = useState('files'); // 'files' or 'reports'

  // --- FILE MANAGER STATE ---
  const [currentPath, setCurrentPath] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editorVisible, setEditorVisible] = useState(false);
  const [activeFile, setActiveFile] = useState(null);
  const [fileContent, setFileContent] = useState('');
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogType, setDialogType] = useState('file'); 
  const [newItemName, setNewItemName] = useState('');

  // --- REPORTS STATE ---
  const [showBrowser, setShowBrowser] = useState(false);
  // This URL forces Gmail to open in "Search Mode" for your specific subject line
  const REPORT_URL = "https://mail.google.com/mail/mu/mp/#tl/search/subject%3ACorrection%20for";

  useEffect(() => {
    const init = async () => {
      await FileSystemService.initializeProjectStructure();
      loadDirectory('');
    };
    init();
  }, []);

  // ==========================================
  //  TAB 1: FILE MANAGER LOGIC
  // ==========================================
  const loadDirectory = async (path) => {
    setLoading(true);
    const result = await FileSystemService.readDirectory(path);
    setItems(result);
    setCurrentPath(path);
    setLoading(false);
  };

  const handleGoUp = () => {
    if (currentPath === '') return;
    const parentPath = currentPath.split('/').slice(0, -1).join('/');
    loadDirectory(parentPath);
  };

  const handleItemPress = async (item) => {
    if (item.isDirectory) {
      loadDirectory(item.path);
    } else {
      const content = await FileSystemService.readFile(item.path);
      setActiveFile(item);
      setFileContent(content || '');
      setUnsavedChanges(false);
      setEditorVisible(true);
    }
  };

  const handleCreate = async () => {
    if (!newItemName.trim()) return;
    const fullPath = currentPath ? `${currentPath}/${newItemName}` : newItemName;

    if (dialogType === 'folder') {
      await FileSystemService.createFolder(fullPath);
    } else {
      let fileName = fullPath;
      if (!fileName.includes('.')) fileName += '.json'; 
      await FileSystemService.writeFile(fileName, '[]'); 
    }
    setDialogVisible(false);
    setNewItemName('');
    loadDirectory(currentPath);
  };

  const handleDelete = async (item) => {
    Alert.alert("Confirm Delete", `Permanently delete "${item.name}"?`, [
      { text: "Cancel" },
      { text: "Delete", style: 'destructive', onPress: async () => {
        await FileSystemService.deleteItem(item.path);
        loadDirectory(currentPath);
      }}
    ]);
  };

  const handleImport = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
      if (res.canceled) return;
      
      const file = res.assets[0];
      let content = await FileSystemService.readFile(file.uri);
      if (!content) {
           const response = await fetch(file.uri);
           content = await response.text();
      }

      const fileName = currentPath ? `${currentPath}/${file.name}` : file.name;
      await FileSystemService.writeFile(fileName, content);
      Alert.alert("Imported", `File saved.`);
      loadDirectory(currentPath);
    } catch (e) {
      Alert.alert("Error", "Import Failed.");
    }
  };

  const saveFile = async () => {
    if (activeFile.name.endsWith('.json')) {
      try {
        JSON.parse(fileContent);
      } catch (e) {
        Alert.alert("Syntax Error", "Invalid JSON. Fix before saving.");
        return;
      }
    }
    await FileSystemService.writeFile(activeFile.path, fileContent);
    setUnsavedChanges(false);
    await AsyncStorage.removeItem('contacts'); 
    Alert.alert("Saved", "System updated.");
  };

  const formatJson = () => {
    try {
      const obj = JSON.parse(fileContent);
      setFileContent(JSON.stringify(obj, null, 2));
    } catch (e) { Alert.alert("Error", "Invalid JSON"); }
  };

  // ==========================================
  //  RENDER VIEWS
  // ==========================================

  const renderFileManager = () => (
    <>
      <View style={styles.pathBar}>
        <TouchableOpacity onPress={handleGoUp} disabled={currentPath === ''}>
          <Ionicons name="arrow-back" size={24} color={currentPath === '' ? '#333' : '#F05819'} />
        </TouchableOpacity>
        <Text style={styles.pathText} numberOfLines={1}>
          ~/AdityaData/{currentPath}
        </Text>
      </View>

      <View style={styles.toolbar}>
        <TouchableOpacity style={styles.toolBtn} onPress={() => { setDialogType('folder'); setDialogVisible(true); }}>
           <Ionicons name="folder-open-outline" size={18} color="#fff" />
           <Text style={styles.toolText}>Folder</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.toolBtn} onPress={() => { setDialogType('file'); setDialogVisible(true); }}>
           <Ionicons name="document-text-outline" size={18} color="#fff" />
           <Text style={styles.toolText}>File</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.toolBtn, {backgroundColor: '#2E7D32'}]} onPress={handleImport}>
           <Ionicons name="cloud-upload-outline" size={18} color="#fff" />
           <Text style={styles.toolText}>Import</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={items}
        keyExtractor={item => item.path}
        contentContainerStyle={{ padding: 15 }}
        ListEmptyComponent={<Text style={styles.emptyText}>Empty Folder</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.row} 
            onPress={() => handleItemPress(item)}
            onLongPress={() => handleDelete(item)}
          >
            <View style={{flexDirection: 'row', alignItems: 'center', flex: 1}}>
              <Ionicons 
                name={item.isDirectory ? "folder" : "document-text"} 
                size={28} 
                color={item.isDirectory ? "#FFB74D" : "#90CAF9"} 
              />
              <View style={{marginLeft: 15}}>
                  <Text style={styles.rowText}>{item.name}</Text>
                  <Text style={styles.rowSubText}>
                      {item.isDirectory ? 'Folder' : `${(item.size / 1024).toFixed(1)} KB`}
                  </Text>
              </View>
            </View>
            <Ionicons name="ellipsis-vertical" size={20} color="#666" />
          </TouchableOpacity>
        )}
      />
    </>
  );

  // --- NEW: IN-APP REPORT BROWSER ---
  const renderReports = () => {
    if (showBrowser) {
        return (
            <View style={{flex: 1}}>
                <View style={styles.browserBar}>
                    <TouchableOpacity onPress={() => setShowBrowser(false)} style={styles.browserClose}>
                        <Ionicons name="close" size={24} color="#fff" />
                        <Text style={{color:'white', marginLeft: 5}}>Close Inbox</Text>
                    </TouchableOpacity>
                    <Text style={{color:'#aaa', fontSize: 12}}>Secure Google View</Text>
                </View>
                <WebView 
                    source={{ uri: REPORT_URL }} 
                    startInLoadingState={true}
                    renderLoading={() => <ActivityIndicator size="large" color="#F05819" style={{position:'absolute', top: '50%', left: '50%'}} />}
                />
            </View>
        );
    }

    return (
        <View style={styles.reportsContainer}>
            <Ionicons name="mail-unread-outline" size={80} color="#333" />
            <Text style={styles.reportTitle}>Report Inbox</Text>
            <Text style={styles.reportDesc}>
                View user reports directly inside the app. 
                This connects securely to your Gmail and filters for "Correction" emails only.
            </Text>

            <TouchableOpacity style={styles.connectBtn} onPress={() => setShowBrowser(true)}>
                <Ionicons name="logo-google" size={24} color="#fff" />
                <Text style={styles.connectBtnText}>Connect to Gmail</Text>
            </TouchableOpacity>
            
            <Text style={styles.secureText}>
                <Ionicons name="lock-closed" size={12} color="#666" /> Secure Connection via Google
            </Text>
        </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a1a" />
      
      {/* TOP HEADER (Hidden when browser is open for more space) */}
      {!showBrowser && (
          <View style={styles.header}>
            <View style={{flexDirection:'row', alignItems:'center'}}>
                <Ionicons name="terminal" size={24} color="#F05819" />
                <Text style={styles.headerTitle}> DEV CONSOLE</Text>
            </View>
            <TouchableOpacity onPress={() => navigation.replace('Login')}>
               <Text style={styles.logoutText}>EXIT</Text>
            </TouchableOpacity>
          </View>
      )}

      {/* TABS (Hidden when browser is open) */}
      {!showBrowser && (
          <View style={styles.tabBar}>
              <TouchableOpacity 
                style={[styles.tabItem, activeTab === 'files' && styles.activeTab]} 
                onPress={() => setActiveTab('files')}
              >
                  <Text style={[styles.tabText, activeTab === 'files' && styles.activeTabText]}>DATA FILES</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.tabItem, activeTab === 'reports' && styles.activeTab]} 
                onPress={() => setActiveTab('reports')}
              >
                  <Text style={[styles.tabText, activeTab === 'reports' && styles.activeTabText]}>REPORTS</Text>
              </TouchableOpacity>
          </View>
      )}

      {/* CONTENT AREA */}
      <View style={styles.content}>
          {activeTab === 'files' ? renderFileManager() : renderReports()}
      </View>

      {/* --- MODALS --- */}
      
      {/* Create Dialog */}
      <Modal transparent visible={dialogVisible} animationType="fade">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>Create {dialogType === 'folder' ? 'Folder' : 'File'}</Text>
            <TextInput 
              style={styles.dialogInput}
              placeholder="Name..."
              placeholderTextColor="#666"
              value={newItemName}
              onChangeText={setNewItemName}
              autoFocus
            />
            <View style={styles.dialogButtons}>
              <TouchableOpacity onPress={() => setDialogVisible(false)} style={styles.dialogBtn}>
                <Text style={styles.dialogBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleCreate} style={[styles.dialogBtn, {backgroundColor:'#F05819'}]}>
                <Text style={[styles.dialogBtnText, {color:'white'}]}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Code Editor */}
      <Modal visible={editorVisible} animationType="slide">
        <SafeAreaView style={styles.editorContainer}>
          <View style={styles.editorHeader}>
             <TouchableOpacity onPress={() => setEditorVisible(false)}>
               <Text style={styles.editorClose}>Close</Text>
             </TouchableOpacity>
             <Text style={styles.editorTitle}>{activeFile?.name}</Text>
             <TouchableOpacity onPress={saveFile} disabled={!unsavedChanges}>
               <Text style={[styles.editorSave, !unsavedChanges && {opacity: 0.5}]}>SAVE</Text>
             </TouchableOpacity>
          </View>

          <View style={styles.editorToolbar}>
             <TouchableOpacity style={styles.editorTool} onPress={formatJson}>
                <Text style={styles.editorToolText}>Format JSON</Text>
             </TouchableOpacity>
             <TouchableOpacity style={styles.editorTool} onPress={() => Clipboard.setStringAsync(fileContent)}>
                <Text style={styles.editorToolText}>Copy</Text>
             </TouchableOpacity>
          </View>

          <TextInput
            style={styles.editorInput}
            multiline
            value={fileContent}
            onChangeText={(t) => { setFileContent(t); setUnsavedChanges(true); }}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </SafeAreaView>
      </Modal>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  
  // Header
  header: { 
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', 
      padding: 15, backgroundColor: '#1a1a1a', borderBottomWidth: 1, borderBottomColor: '#333' 
  },
  headerTitle: { color: '#fff', fontWeight: 'bold', fontSize: 16, letterSpacing: 1 },
  logoutText: { color: '#F05819', fontWeight: 'bold', fontSize: 12 },

  // Tabs
  tabBar: { flexDirection: 'row', backgroundColor: '#1a1a1a' },
  tabItem: { flex: 1, paddingVertical: 15, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  activeTab: { borderBottomColor: '#F05819' },
  tabText: { color: '#666', fontWeight: 'bold', fontSize: 12 },
  activeTabText: { color: '#fff' },

  content: { flex: 1 },

  // File Manager Styles
  pathBar: { flexDirection: 'row', alignItems: 'center', padding: 10, backgroundColor: '#222' },
  pathText: { color: '#ccc', marginLeft: 10, fontFamily: 'monospace' },
  toolbar: { flexDirection: 'row', padding: 10, backgroundColor: '#121212', borderBottomWidth: 1, borderBottomColor: '#333' },
  toolBtn: { 
      flexDirection: 'row', alignItems: 'center', backgroundColor: '#333', 
      paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6, marginRight: 10 
  },
  toolText: { color: '#fff', fontSize: 12, marginLeft: 6, fontWeight: '600' },
  
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#222' },
  rowText: { color: '#eee', fontSize: 16 },
  rowSubText: { color: '#666', fontSize: 12 },
  emptyText: { color: '#444', textAlign: 'center', marginTop: 50 },

  // --- REPORT STYLES ---
  reportsContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 },
  reportTitle: { color: '#fff', fontSize: 24, fontWeight: 'bold', marginTop: 20 },
  reportDesc: { color: '#888', textAlign: 'center', marginTop: 10, marginBottom: 40, lineHeight: 22 },
  connectBtn: { 
      flexDirection: 'row', alignItems: 'center', backgroundColor: '#4285F4', 
      paddingVertical: 15, paddingHorizontal: 30, borderRadius: 30 
  },
  connectBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16, marginLeft: 10 },
  secureText: { color: '#666', marginTop: 20, fontSize: 12 },

  // Browser Styles
  browserBar: { 
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', 
      padding: 10, backgroundColor: '#222', borderBottomWidth: 1, borderBottomColor: '#333' 
  },
  browserClose: { flexDirection: 'row', alignItems: 'center', padding: 5 },

  // Editor
  editorContainer: { flex: 1, backgroundColor: '#1e1e1e' },
  editorHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 15, backgroundColor: '#252526' },
  editorTitle: { color: '#fff', fontWeight: 'bold' },
  editorClose: { color: '#aaa' },
  editorSave: { color: '#4CAF50', fontWeight: 'bold' },
  editorInput: { flex: 1, color: '#d4d4d4', fontFamily: 'monospace', padding: 15, fontSize: 14, textAlignVertical: 'top' },
  editorToolbar: { flexDirection: 'row', backgroundColor: '#2d2d2d', padding: 5 },
  editorTool: { padding: 8, marginRight: 10 },
  editorToolText: { color: '#569cd6', fontSize: 12, fontWeight: 'bold' },

  // Dialog
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 20 },
  dialog: { backgroundColor: '#222', borderRadius: 10, padding: 20, borderWidth: 1, borderColor: '#333' },
  dialogTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  dialogInput: { backgroundColor: '#111', color: '#fff', padding: 10, borderRadius: 5, borderWidth: 1, borderColor: '#333', marginBottom: 20 },
  dialogButtons: { flexDirection: 'row', justifyContent: 'flex-end' },
  dialogBtn: { paddingVertical: 8, paddingHorizontal: 15, borderRadius: 5, marginLeft: 10, backgroundColor: '#333' },
  dialogBtnText: { color: '#fff', fontWeight: 'bold' }
});

export default DeveloperScreen;