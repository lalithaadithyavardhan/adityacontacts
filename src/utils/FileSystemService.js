import * as FileSystem from 'expo-file-system/legacy';

// ---------------------------------------------------------
// 1. IMPORT ALL SOURCE DATA
// ---------------------------------------------------------
import { initialContacts as contactsData } from '../data/contactsData';
import { initialContacts as enggData } from '../data/SchoolOfEnggData'; 
import { initialContacts as freshmanData } from '../data/FreshmanEngineeringData';
import { initialContacts as pharmacyData } from '../data/SchoolOfPharmacyData';
import { initialContacts as businessData } from '../data/SchoolOfBusinessData';
import { initialContacts as scienceData } from '../data/SchoolOfScienceData';
import { initialContacts as officesData } from '../data/OfficesData';
import { initialContacts as serviceData } from '../data/ServiceAndMaintenanceData';
import { initialContacts as academicData } from '../data/AcademicSupportData';

// 🔒 THE SANDBOX FOLDER
const BASE_DIR = FileSystem.documentDirectory + 'AdityaData/';

// ---------------------------------------------------------
// 2. DEFINE FILES (Matching Your Exact Source Names)
// ---------------------------------------------------------
const DEFAULT_FILES = [
  { name: 'contactsData.json',            data: contactsData },
  { name: 'SchoolOfEnggData.json',        data: enggData },
  { name: 'FreshmanEngineeringData.json', data: freshmanData },
  { name: 'SchoolOfPharmacyData.json',    data: pharmacyData },
  { name: 'SchoolOfBusinessData.json',    data: businessData },
  { name: 'SchoolOfScienceData.json',     data: scienceData },
  { name: 'OfficesData.json',             data: officesData },
  { name: 'ServiceAndMaintenanceData.json',data: serviceData },
  { name: 'AcademicSupportData.json',     data: academicData }
];

export const FileSystemService = {
  
  // 1. INITIALIZE
  initializeProjectStructure: async () => {
    try {
      // Step A: Create Folder
      const dirInfo = await FileSystem.getInfoAsync(BASE_DIR);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(BASE_DIR, { intermediates: true });
      }

      // Step B: Create Files (Only if they don't exist)
      for (const file of DEFAULT_FILES) {
        const filePath = BASE_DIR + file.name;
        const fileInfo = await FileSystem.getInfoAsync(filePath);

        if (!fileInfo.exists) {
          console.log(`Creating: ${file.name}`);
          // Ensure data is not undefined before writing
          const content = file.data ? JSON.stringify(file.data, null, 2) : "[]";
          await FileSystem.writeAsStringAsync(filePath, content);
        }
      }
      return true;
    } catch (e) {
      console.error("FS Init Failed:", e);
      return false;
    }
  },

  // 2. READ DIRECTORY
  readDirectory: async (subPath = '') => {
    try {
      const targetPath = subPath ? (BASE_DIR + subPath) : BASE_DIR;
      const items = await FileSystem.readDirectoryAsync(targetPath);
      
      const detailedItems = await Promise.all(items.map(async (name) => {
        const info = await FileSystem.getInfoAsync(targetPath + '/' + name);
        return {
          name,
          isDirectory: info.isDirectory,
          size: info.size,
          uri: info.uri,
          path: subPath ? `${subPath}/${name}` : name
        };
      }));

      return detailedItems.sort((a, b) => (b.isDirectory === a.isDirectory ? 0 : b.isDirectory ? 1 : -1));
    } catch (e) { return []; }
  },

  // 3. READ FILE
  readFile: async (path) => {
    try {
      const isFullUri = path.startsWith('file://') || path.startsWith('content://');
      const targetPath = isFullUri ? path : BASE_DIR + path;
      return await FileSystem.readAsStringAsync(targetPath);
    } catch (e) { return null; }
  },

  // 4. WRITE FILE
  writeFile: async (path, content) => {
    try {
      await FileSystem.writeAsStringAsync(BASE_DIR + path, content);
      return true;
    } catch (e) { return false; }
  },

  // 5. CREATE FOLDER
  createFolder: async (path) => {
    try {
      await FileSystem.makeDirectoryAsync(BASE_DIR + path, { intermediates: true });
      return true;
    } catch (e) { return false; }
  },

  // 6. DELETE ITEM
  deleteItem: async (path) => {
    try {
      await FileSystem.deleteAsync(BASE_DIR + path, { idempotent: true });
      return true;
    } catch (e) { return false; }
  },

  // 7. LOAD ALL DATA (Merge everything)
  loadAllData: async () => {
    try {
      const files = await FileSystem.readDirectoryAsync(BASE_DIR);
      let allContacts = [];

      for (const filename of files) {
        if (filename.endsWith('.json')) {
          const content = await FileSystem.readAsStringAsync(BASE_DIR + filename);
          const data = JSON.parse(content);
          if (Array.isArray(data)) {
            allContacts = [...allContacts, ...data];
          }
        }
      }
      
      if (allContacts.length === 0) return contactsData; // Fallback
      return allContacts;
    } catch (e) { 
      return contactsData; 
    }
  }
};