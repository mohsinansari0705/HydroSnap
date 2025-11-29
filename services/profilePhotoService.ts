import { supabase } from '../lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';

interface PhotoUploadResult {
  success: boolean;
  photoUrl?: string;
  error?: string;
}

class ProfilePhotoService {
  private readonly BUCKET_NAME = 'profile-images';

  /**
   * Request camera and media library permissions
   */
  async requestPermissions(): Promise<boolean> {
    try {
      const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
      const mediaPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (cameraPermission.status !== 'granted' || mediaPermission.status !== 'granted') {
        Alert.alert(
          'Permissions Required',
          'Please grant camera and photo library permissions to upload profile photos.',
          [{ text: 'OK' }]
        );
        return false;
      }

      return true;
    } catch (error) {
      console.error('Permission request failed:', error);
      return false;
    }
  }

  /**
   * Pick image from camera or library
   */
  async pickImage(source: 'camera' | 'library'): Promise<string | null> {
    try {
      const hasPermissions = await this.requestPermissions();
      if (!hasPermissions) return null;

      let result: ImagePicker.ImagePickerResult;

      if (source === 'camera') {
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });
      }

      if (!result.canceled && result.assets && result.assets.length > 0) {
        return result.assets[0].uri;
      }

      return null;
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
      return null;
    }
  }

  /**
   * Get role folder name from user role
   */
  private getRoleFolder(role: string): string {
    switch (role) {
      case 'field_personnel':
        return 'field_personnel';
      case 'central_analyst':
        return 'central_analyst';
      case 'supervisor':
        return 'supervisor';
      case 'public':
        return 'public_user';
      default:
        return 'public_user';
    }
  }

  /**
   * Upload profile photo to Supabase storage in role-based folders
   * Following the exact pattern from waterLevelReadingsService
   */
  async uploadProfilePhoto(photoUri: string, userId: string, userRole: string): Promise<PhotoUploadResult> {
    try {
      console.log('📸 Uploading profile photo for user:', userId, 'role:', userRole);

      // Extract file extension from URI
      const fileExt = photoUri.split('.').pop()?.toLowerCase() || 'jpeg';
      
      // Get role folder
      const roleFolder = this.getRoleFolder(userRole);
      
      // Create filename: {userId}_photo.{ext}
      const filename = `${userId}_photo.${fileExt}`;
      
      // Create storage path: {roleFolder}/{filename}
      const storagePath = `${roleFolder}/${filename}`;
      
      console.log('📁 Storage path:', storagePath);

      // For React Native, read the file as ArrayBuffer (EXACT same as gauge-photos)
      const response = await fetch(photoUri);
      const arrayBuffer = await response.arrayBuffer();

      // Upload to Supabase storage (EXACT same pattern as gauge-photos)
      const { data, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .upload(storagePath, arrayBuffer, {
          contentType: `image/${fileExt}`,
          upsert: true, // Replace existing photo
        });

      if (error) {
        console.error('❌ Upload error:', error);
        console.error('Upload error details:', JSON.stringify(error, null, 2));
        return { 
          success: false, 
          error: error.message || 'Failed to upload photo' 
        };
      }

      console.log('✅ Upload successful:', data);

      // Generate public URL (EXACT same format as gauge-photos)
      const publicUrl = `https://fibganvflundperooxfs.supabase.co/storage/v1/object/public/profile-images/${storagePath}`;
      
      console.log('🔗 Public URL:', publicUrl);

      // Update profile table with the photo URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ profile_image_url: publicUrl })
        .eq('id', userId);

      if (updateError) {
        console.error('❌ Profile update error:', updateError);
        return { 
          success: false, 
          error: 'Photo uploaded but failed to update profile' 
        };
      }

      console.log('✅ Profile updated with photo URL');
      return { success: true, photoUrl: publicUrl };

    } catch (error) {
      console.error('❌ Photo upload failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Remove profile photo
   */
  async removeProfilePhoto(userId: string, userRole: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Get role folder
      const roleFolder = this.getRoleFolder(userRole);
      
      // Get current profile to find photo filename
      const { data: profile } = await supabase
        .from('profiles')
        .select('profile_image_url')
        .eq('id', userId)
        .single();

      if (profile?.profile_image_url) {
        // Extract filename from URL
        const urlParts = profile.profile_image_url.split('/');
        const fileName = urlParts[urlParts.length - 1];
        const storagePath = `${roleFolder}/${fileName}`;

        // Delete from storage
        const { error: deleteError } = await supabase.storage
          .from(this.BUCKET_NAME)
          .remove([storagePath]);

        if (deleteError) {
          console.error('Delete error:', deleteError);
        }
      }

      // Update profile to remove URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ profile_image_url: null })
        .eq('id', userId);

      if (updateError) {
        return { success: false, error: 'Failed to update profile' };
      }

      return { success: true };

    } catch (error) {
      console.error('Photo removal failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
}

export const profilePhotoService = new ProfilePhotoService();
