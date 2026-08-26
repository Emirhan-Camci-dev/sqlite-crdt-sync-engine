import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, Button, FlatList, TextInput } from 'react-native';
import * as SQLite from 'expo-sqlite';
import { SyncEngine, initializeSyncTables, trackTable } from '@sync-engine/client';

export default function App() {
  const [db, setDb] = useState<SQLite.SQLiteDatabase | null>(null);
  const [engine, setEngine] = useState<SyncEngine | null>(null);
  const [todos, setTodos] = useState<{ id: string; text: string; status: string }[]>([]);
  const [newTodo, setNewTodo] = useState('');

  useEffect(() => {
    async function setup() {
      // 1. Open Database
      const database = await SQLite.openDatabaseAsync('sync_demo.db');
      setDb(database);

      // 2. Setup Application Tables
      await database.execAsync(`
        CREATE TABLE IF NOT EXISTS todos (
          id TEXT PRIMARY KEY,
          text TEXT NOT NULL,
          status TEXT NOT NULL
        );
      `);

      // 3. Initialize Sync Engine Tracking
      await initializeSyncTables(database);
      
      // We assume trackTable has been fixed/works nicely to create triggers
      await trackTable(database, 'todos', ['id', 'text', 'status']);

      // 4. Create Sync Engine Instance
      // Use standard localhost (10.0.2.2 for Android emulator, localhost for iOS simulator)
      const serverUrl = 'http://127.0.0.1:3000'; 
      const syncEngine = new SyncEngine(database, 'CLIENT_' + Math.floor(Math.random()*1000), serverUrl);
      await syncEngine.init();
      setEngine(syncEngine);

      // Load initial data
      loadTodos(database);
    }
    setup();
  }, []);

  const loadTodos = async (database: SQLite.SQLiteDatabase) => {
    const allRows = await database.getAllAsync('SELECT * FROM todos');
    setTodos(allRows as any);
  };

  const addTodo = async () => {
    if (!db || !newTodo) return;
    const id = Date.now().toString();
    // Insert will fire the tracking trigger!
    await db.runAsync('INSERT INTO todos (id, text, status) VALUES (?, ?, ?)', [id, newTodo, 'active']);
    setNewTodo('');
    loadTodos(db);
  };

  const handleSync = async () => {
    if (!engine || !db) return;
    try {
      await engine.sync();
      alert('Sync successful!');
      loadTodos(db);
    } catch (err: any) {
      alert('Sync failed: ' + err.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Offline-First Sync Demo</Text>
      
      <View style={styles.inputContainer}>
        <TextInput 
          style={styles.input} 
          value={newTodo} 
          onChangeText={setNewTodo} 
          placeholder="New Todo" 
        />
        <Button title="Add" onPress={addTodo} />
      </View>

      <FlatList
        data={todos}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.todoItem}>
            <Text>{item.text} - {item.status}</Text>
          </View>
        )}
      />

      <View style={styles.syncContainer}>
        <Button title="Sync with Server" onPress={handleSync} color="green" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    marginRight: 10,
    paddingHorizontal: 10,
  },
  todoItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  syncContainer: {
    padding: 20,
    paddingBottom: 40,
  },
});
