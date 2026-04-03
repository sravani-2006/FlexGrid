import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Platform,
  StatusBar,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import LocationPickerMap from '../components/LocationPickerMap';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { 
  analyzeIssueImage, 
  validateIssueImage, 
  uriToBase64 
} from '../lib/gemini';
import { supabase } from '../lib/supabase';
import { uploadImage } from '../utils/storage';

const steps = ['Upload', 'Location', 'Details'];

const severityMap = {
  low: 'low',
  medium: 'medium',
  high: 'critical', // Mapping 'high' to 'critical' for the DB
};

const issueTypeMap = {
  Water: 'water_leakage',
  Road: 'road_damage',
  Power: 'power_cut',
  Drainage: 'drainage',
  Garbage: 'garbage',
  Streetlight: 'streetlight',
  Other: 'other',
};

const getValidIssueType = (type) => {
  if (!type) return 'other';

  // Try direct match
  if (issueTypeMap[type]) return issueTypeMap[type];

  // Try lowercase match
  const lower = type.toLowerCase();

  const reverseMap = {
    water: 'water_leakage',
    road: 'road_damage',
    power: 'power_cut',
    drainage: 'drainage',
    garbage: 'garbage',
    streetlight: 'streetlight',
    other: 'other',
  };

  return reverseMap[lower] || 'other';
};

const ReportIssueScreen = ({ navigation }) => {
  const { showToast } = useToast();
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [image, setImage] = useState(null);
  const [location, setLocation] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('Water');
  const [severity, setSeverity] = useState('medium');
  const [locationName, setLocationName] = useState('');
  const [suggesting, setSuggesting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [profile, setProfile] = useState(null);
  const [validatingImage, setValidatingImage] = useState(false);

  React.useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      try {
        const { data } = await supabase
          .from('profiles')
          .select('avatar_url')
          .eq('id', user.id)
          .single();
        if (data) setProfile(data);
      } catch (err) {
        console.log("Report Profile Fetch Error:", err);
      }
    };
    fetchProfile();
  }, [user]);

  const categoryOptions = useMemo(
    () => [
      { key: 'Water', icon: 'water', label: 'Water' },
      { key: 'Power', icon: 'flash', label: 'Power' },
      { key: 'Road', icon: 'construct', label: 'Road' },
      { key: 'Other', icon:'', label: 'Other' },
      { key: 'Drainage', icon: 'build', label: 'Drainage' },
      { key: 'Garbage', icon: 'trash', label: 'Garbage' },
      { key: 'Streetlight', icon: 'bulb', label: 'Light' },
      
    ],
    []
  );

  const requestLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showToast('Location permission denied', 'error');
        return;
      }
      
      showToast('Detecting location...', 'info');

      const loc = await Location.getCurrentPositionAsync({
         accuracy: Location.Accuracy.Balanced 
      });

      if (loc && loc.coords) {
         setLocation(loc.coords);
         
         // Get readable address
         const address = await Location.reverseGeocodeAsync({
           latitude: loc.coords.latitude,
           longitude: loc.coords.longitude,
         });

         if (address && address.length > 0) {
           const item = address[0];
           const readableAddress = [
             item.name,
             item.street,
             item.district,
             item.city
           ].filter(Boolean).slice(0, 3).join(', ');
           
           setLocationName(readableAddress || "Detected Location");
         }
         
         showToast('Location detected 📍', 'success');
      } else {
         throw new Error("No coords returned");
      }
    } catch(err) {
      console.warn("Location error:", err);
      // Fallback
      const lastLoc = await Location.getLastKnownPositionAsync();
      if (lastLoc && lastLoc.coords) {
         setLocation(lastLoc.coords);
         showToast('Used last known location 📍', 'success');
      } else {
         showToast('Failed to identify location. Provide Details manually', 'error');
      }
    }
  };

  const validateImage = async (uri) => {
    setValidatingImage(true);
    try {
      showToast('AI Verifying Image...', 'success');
      const aiResult = await analyzeIssueImage(uri);
      
      if (aiResult.is_valid_civic_issue === false) {
        setImage(null);
        Alert.alert(
          "Invalid Issue",
          "Please upload a civic issue like pothole, leakage, or garbage."
        );
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return false;
      }

      // If valid, auto-fill for the user to make it faster
      setTitle(aiResult.title || '');
      setDescription(aiResult.description || '');
      
      const validTypes = ['Water', 'Road', 'Power', 'Drainage', 'Garbage', 'Streetlight', 'Other'];
      if (aiResult.category && validTypes.includes(aiResult.category)) {
        setType(aiResult.category);
      }
      
      const validSeverities = ['low', 'medium', 'high'];
      if (aiResult.severity && validSeverities.includes(aiResult.severity)) {
        setSeverity(aiResult.severity);
      }

      showToast('Image verified & details auto-filled! ✨', 'success');
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return true;
    } catch (err) {
      console.warn("Validation error:", err);
      // If AI fails, we still allow them to proceed but show a warning
      showToast('AI Verification skipped. Proceed manually.', 'error');
      return true; 
    } finally {
      setValidatingImage(false);
    }
  };

  const searchLocation = async () => {
    if (!locationName.trim()) {
      showToast('Enter a location name first', 'error');
      return;
    }
    
    try {
      showToast('Searching location...', 'success');
      const results = await Location.geocodeAsync(locationName);
      if (results.length > 0) {
        const { latitude, longitude } = results[0];
        setLocation({ latitude, longitude });
        showToast('Location found! 📍', 'success');
      } else {
        showToast('No results found for that location', 'error');
      }
    } catch (err) {
      console.warn("Geocoding error:", err);
      showToast('Search failed: Ensure location name is valid', 'error');
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });
    if (!result.canceled) {
      const uri = result.assets[0].uri;
      const isValid = await validateImage(uri);
      if (isValid) setImage(uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
        showToast('Camera permission denied', 'error');
        return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });
    if (!result.canceled) {
      const uri = result.assets[0].uri;
      const isValid = await validateImage(uri);
      if (isValid) setImage(uri);
    }
  };

  const nextStep = async () => {
    await Haptics.selectionAsync();
    if (step === 0 && !image) {
      showToast('Upload an image first', 'error');
      return;
    }
    if (step === 1 && !location) {
      showToast('Select location first', 'error');
      return;
    }
    setStep((prev) => Math.min(prev + 1, 2));
  };

  const previousStep = async () => {
    await Haptics.selectionAsync();
    setStep((prev) => Math.max(prev - 1, 0));
  };

  const applySuggestion = async () => {
    if (!image) {
      showToast('Please upload an image first to use AI', 'error');
      return;
    }
    setSuggesting(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const aiResult = await analyzeIssueImage(image);
      setTitle(aiResult.title || 'Civic Issue Detected');
      setDescription(aiResult.description || 'Details generated via FixGrid AI.');
      
      const validTypes = ['Water', 'Road', 'Power', 'Drainage', 'Garbage', 'Streetlight', 'Other'];
      setType(validTypes.includes(aiResult.category) ? aiResult.category : 'Water');
      
      const validSeverities = ['low', 'medium', 'high'];
      setSeverity(validSeverities.includes(aiResult.severity) ? aiResult.severity : 'medium');
      
      showToast('AI suggestions applied ✅', 'success');
    } catch (err) {
      console.error("Gemini Analysis Error:", err);
      showToast(`AI Analysis Failed: ${err.message || 'Check Key'}`, 'error');
    } finally {
      setSuggesting(false);
    }
  };

  const submit = async () => {
    if (!title || !description) {
      showToast('Fill all details before submit', 'error');
      return;
    }
    
    setSubmitting(true);
    try {
        // Final AI Validation Check (Requested Double-Check)
        console.log("Submit Step 0: Final AI Vibe Check...");
        try {
          const base64 = await uriToBase64(image);
          const validation = await validateIssueImage(base64);

          if (!validation.valid) {
              Alert.alert(
                "Invalid Issue",
                "Please upload a civic issue like pothole, leakage, or garbage."
              );
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              setSubmitting(false);
              return;
          }
        } catch (vErr) {
          console.warn("Final validation check skipped:", vErr);
        }

        console.log("Submit Step 1: Uploading Image...");
        const publicUrl = await uploadImage(image);
        if (!publicUrl) throw new Error("Image upload failed to return a URL.");
        
        console.log("Submit Step 2: Saving to Database...");
        
        // Map the selected category to the validated DB value
        const dbCategory = getValidIssueType(type);
        const mappedSeverity = severityMap[severity] || severity;

        console.log("--- SUBMISSION LOGS ---");
        console.log("Category Original:", type);
        console.log("Category Mapped:", dbCategory);
        console.log("Severity Original:", severity);
        console.log("Severity Mapped:", mappedSeverity);

        const { error } = await supabase.from('issues').insert({
            title,
            description,
            issue_type: dbCategory, // Validated mapping
            severity: mappedSeverity, // Mapped severity
            latitude: location.latitude,
            longitude: location.longitude,
            location_name: locationName || "Detected Location",
            user_id: user?.id,
            status: 'open',
            before_photo_url: publicUrl, // Correct column name
        });

        if (error) {
            console.error("Supabase DB Insert Error:", error);
            throw new Error(`Database Error: ${error.message}`);
        }

        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        showToast('Issue reported successfully ✅');
        navigation.navigate('Track');
    } catch (e) {
        console.error("Submission Error:", e);
        showToast(`Failed: ${e.message || 'Unknown error'}`, 'error');
    } finally {
        setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={24} color="#60708A" />
          </TouchableOpacity>
          <Text style={styles.brand}>FixGrid Report</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('CitizenProfile')}>
          <View style={[styles.headerAvatar, { overflow: 'hidden', backgroundColor: '#FFFFFF', width: 44, height: 44, borderRadius: 22 }]}>
            <Image 
              key={profile?.avatar_url}
              source={{ uri: profile?.avatar_url || 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=300&q=80' }} 
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.progressHeader}>
          {steps.map((label, idx) => (
            <View key={label} style={styles.stepWrap}>
              <View style={[styles.stepCircle, idx <= step && styles.stepCircleActive]}>
                <Text style={[styles.stepNumber, idx <= step && styles.stepNumberActive]}>{idx + 1}</Text>
              </View>
              <Text style={[styles.stepLabel, idx <= step && styles.stepLabelActive]}>{label}</Text>
            </View>
          ))}
        </View>

        {step === 0 ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Step 1: Upload Photo</Text>
            {validatingImage ? (
              <View style={[styles.uploadBox, { borderColor: '#4F5D33' }]}>
                <ActivityIndicator size="large" color="#4F5D33" />
                <Text style={[styles.uploadTitle, { marginTop: 15 }]}>AI Verifying Content...</Text>
                <Text style={styles.uploadSub}>Blocking irrelevant uploads</Text>
              </View>
            ) : (
              <>
                <TouchableOpacity style={styles.uploadBox} onPress={takePhoto}>
                  <Ionicons name="camera" size={34} color="#4F5D33" />
                  <Text style={styles.uploadTitle}>Capture the issue</Text>
                  <Text style={styles.uploadSub}>Tap to open camera</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.galleryBtn} onPress={pickImage}>
                  <Ionicons name="images-outline" size={16} color="#4F5D33" />
                  <Text style={styles.galleryText}>Upload from Gallery</Text>
                </TouchableOpacity>
              </>
            )}
            {image && !validatingImage ? <Text style={styles.doneText}>Image verified successfully</Text> : null}
          </View>
        ) : null}

        {step === 1 ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Step 2: Location</Text>
            
            <View style={styles.locationControls}>
              <TouchableOpacity style={styles.detectBtn} onPress={requestLocation}>
                <Ionicons name="locate" size={16} color="#FFFFFF" />
                <Text style={styles.detectText}>Detect Current Location</Text>
              </TouchableOpacity>
              
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OR</Text>
                <View style={styles.dividerLine} />
              </View>

              <View style={styles.searchRow}>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Enter location name..."
                  placeholderTextColor="#94A3B8"
                  value={locationName}
                  onChangeText={setLocationName}
                />
                <TouchableOpacity style={styles.searchBtn} onPress={searchLocation}>
                  <Ionicons name="search" size={18} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>

            {location ? (
              <View style={styles.mapWrap}>
                <LocationPickerMap location={location} onDragEnd={setLocation} />
              </View>
            ) : (
              <View style={styles.placeholderBox}>
                <Text style={styles.placeholderText}>Location not selected yet</Text>
              </View>
            )}
          </View>
        ) : null}

        {step === 2 ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Step 3: Details</Text>
            <TextInput
              style={styles.input}
              placeholder="Issue title"
              placeholderTextColor="#94A3B8"
              value={title}
              onChangeText={setTitle}
            />
            <TextInput
              style={styles.textarea}
              placeholder="Describe the issue"
              placeholderTextColor="#94A3B8"
              value={description}
              onChangeText={setDescription}
              multiline
            />

            <View style={styles.categoryRow}>
              {categoryOptions.map((item) => (
                <TouchableOpacity
                  key={item.key}
                  style={[styles.categoryChip, type === item.key && styles.categoryChipActive]}
                  onPress={() => setType(item.key)}
                >
                  <Ionicons name={item.icon} size={14} color={type === item.key ? '#FFFFFF' : '#374151'} />
                  <Text style={[styles.categoryText, type === item.key && styles.categoryTextActive]}>{item.key}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.severityRow}>
              {['high', 'medium', 'low'].map((item) => (
                <TouchableOpacity
                  key={item}
                  style={[styles.severityChip, severity === item && styles.severityChipActive]}
                  onPress={() => setSeverity(item)}
                >
                  <Text style={[styles.severityText, severity === item && styles.severityTextActive]}>{item}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.aiBtn} onPress={applySuggestion} disabled={suggesting}>
              {suggesting ? <ActivityIndicator color="#4F5D33" /> : <Text style={styles.aiText}>Apply AI Suggestions</Text>}
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.actionsRow}>
          {step > 0 ? (
            <TouchableOpacity style={styles.backBtn} onPress={previousStep} disabled={submitting}>
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>
          ) : <View style={{ flex: 1 }} />}

          {step < 2 ? (
            <TouchableOpacity style={styles.nextBtn} onPress={nextStep}>
              <Text style={styles.nextText}>Next</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={[styles.submitBtn, submitting && { opacity: 0.7 }]} onPress={submit} disabled={submitting}>
              {submitting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitText}>Submit Official Report</Text>}
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#ECE9E1' },
  header: { 
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    height: Platform.OS === 'android' ? StatusBar.currentHeight + 58 : 58, 
    borderBottomWidth: 1, 
    borderBottomColor: '#DCD6CB', 
    backgroundColor: '#F7F8FA', 
    paddingHorizontal: 16, 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    flexDirection: 'row' 
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brand: { fontSize: 18, fontWeight: '800', color: '#1F1F1D' },
  headerAvatar: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: '#D1D5DB', backgroundColor: '#DCD6CB', alignItems: 'center', justifyContent: 'center' },
  container: { flex: 1 },
  content: { padding: 14, paddingBottom: 28 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  stepWrap: { alignItems: 'center', width: 90 },
  stepCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#D1D5DB', alignItems: 'center', justifyContent: 'center' },
  stepCircleActive: { backgroundColor: '#4F5D33' },
  stepNumber: { color: '#374151', fontWeight: '700' },
  stepNumberActive: { color: '#FFFFFF' },
  stepLabel: { marginTop: 6, fontSize: 10, color: '#756C60', textTransform: 'uppercase', letterSpacing: 1.2, fontWeight: '700' },
  stepLabelActive: { color: '#4F5D33' },
  card: { backgroundColor: '#F4F1EA', borderRadius: 16, borderWidth: 1, borderColor: '#DCD6CB', padding: 12, marginBottom: 12 },
  cardTitle: { color: '#1F1F1D', fontWeight: '700', marginBottom: 10, fontSize: 16 },
  uploadBox: { borderWidth: 2, borderColor: '#CBD5E1', borderStyle: 'dashed', borderRadius: 16, paddingVertical: 20, alignItems: 'center' },
  uploadTitle: { marginTop: 10, color: '#1F1F1D', fontWeight: '700', fontSize: 15 },
  uploadSub: { marginTop: 3, color: '#756C60', fontSize: 12 },
  galleryBtn: { marginTop: 10, borderRadius: 12, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#D1D5DB', height: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  galleryText: { color: '#4F5D33', fontWeight: '700', fontSize: 13 },
  detectBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: '#4F5D33', 
    padding: 12, 
    borderRadius: 12, 
    gap: 8,
    marginBottom: 8
  },
  locationControls: { gap: 10, marginBottom: 15 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 4 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#DCD6CB' },
  dividerText: { marginHorizontal: 10, fontSize: 10, fontWeight: '700', color: '#94A3B8' },
  searchRow: { flexDirection: 'row', gap: 8 },
  searchInput: { 
    flex: 1, 
    backgroundColor: '#F8FAFC', 
    borderWidth: 1, 
    borderColor: '#E2E8F0', 
    borderRadius: 12, 
    paddingHorizontal: 12, 
    paddingVertical: 10,
    fontSize: 14,
    color: '#1E293B'
  },
  searchBtn: { 
    backgroundColor: '#4F5D33', 
    width: 44, 
    borderRadius: 12, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  detectText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  doneText: { marginTop: 8, color: '#047857', fontSize: 12, textAlign: 'center' },
  mapWrap: { marginTop: 10, width: '100%', height: 180, borderRadius: 12, overflow: 'hidden', position: 'relative' },
  placeholderBox: { marginTop: 10, height: 100, borderRadius: 12, borderWidth: 1, borderColor: '#CBD5E1', alignItems: 'center', justifyContent: 'center', backgroundColor: '#E2E8F0' },
  placeholderText: { color: '#756C60', fontSize: 12 },
  input: { height: 42, borderRadius: 10, borderWidth: 1, borderColor: '#D1D5DB', backgroundColor: '#FFFFFF', paddingHorizontal: 10, color: '#1F1F1D', marginBottom: 8 },
  textarea: { minHeight: 96, borderRadius: 12, borderWidth: 1, borderColor: '#D1D5DB', backgroundColor: '#FFFFFF', paddingHorizontal: 10, paddingVertical: 10, textAlignVertical: 'top', color: '#1F1F1D' },
  categoryRow: { marginTop: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryChip: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: '#DCD6CB', flexDirection: 'row', alignItems: 'center', gap: 5 },
  categoryChipActive: { backgroundColor: '#4F5D33' },
  categoryText: { color: '#5F5549', fontSize: 12, textTransform: 'capitalize', fontWeight: '700' },
  categoryTextActive: { color: '#FFFFFF' },
  severityRow: { marginTop: 10, flexDirection: 'row', gap: 8 },
  severityChip: { borderRadius: 999, backgroundColor: '#F1F5F9', paddingHorizontal: 12, paddingVertical: 8 },
  severityChipActive: { backgroundColor: '#FEE2E2' },
  severityText: { color: '#475569', fontWeight: '700', textTransform: 'capitalize', fontSize: 12 },
  severityTextActive: { color: '#B91C1C' },
  aiBtn: { marginTop: 10, height: 40, borderRadius: 10, borderWidth: 1, borderColor: '#D1D5DB', backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  aiText: { color: '#4F5D33', fontWeight: '700', fontSize: 12 },
  actionsRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  backBtn: { flex: 1, height: 44, borderRadius: 12, backgroundColor: '#DCD6CB', alignItems: 'center', justifyContent: 'center' },
  backText: { color: '#5F5549', fontWeight: '700' },
  nextBtn: { flex: 1, height: 44, borderRadius: 12, backgroundColor: '#4F5D33', alignItems: 'center', justifyContent: 'center' },
  nextText: { color: '#FFFFFF', fontWeight: '700' },
  submitBtn: { flex: 1, height: 46, borderRadius: 14, backgroundColor: '#4F5D33', alignItems: 'center', justifyContent: 'center' },
  submitText: { color: '#FFFFFF', fontWeight: '700' },
});

export default ReportIssueScreen;
