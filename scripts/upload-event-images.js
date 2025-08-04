const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env file
try {
  require('dotenv').config({ path: path.join(__dirname, '.env') });
  console.log('Loaded environment variables from .env file');
} catch (error) {
  console.log('dotenv not found, using system environment variables');
}

// Supabase configuration
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase configuration. Please set EXPO_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.');
  console.error('Make sure your .env file in the scripts folder contains these variables.');
  process.exit(1);
}

// Debug: Check if environment variables are loaded (without exposing the actual values)
console.log('Environment check:', {
  supabaseUrl: !!supabaseUrl,
  supabaseServiceKey: !!supabaseServiceKey
});

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Configuration
const STORAGE_BUCKET = 'banditsassets';
const STORAGE_FOLDER = 'events';

const IMAGE_FILE = 'disco.png'; // Single image file in scripts folder

async function uploadEventImages() {
  try {
    console.log('Starting event image upload process...');
    console.log('Configuration:', {
      bucket: STORAGE_BUCKET,
      folder: STORAGE_FOLDER,
      imageFile: IMAGE_FILE
    });

    // Test Supabase connection and list buckets
    console.log('\n=== Testing Supabase Connection ===');
    try {
      const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
      if (bucketsError) {
        console.error('Error listing buckets:', bucketsError.message);
        console.error('Full error:', bucketsError);
      } else {
        console.log('Available buckets:', buckets.map(b => b.name));
        const bucketExists = buckets.some(b => b.name === STORAGE_BUCKET);
        console.log(`Bucket '${STORAGE_BUCKET}' exists:`, bucketExists);
        if (!bucketExists) {
          console.error(`❌ Bucket '${STORAGE_BUCKET}' not found!`);
          console.log('Available buckets:', buckets.map(b => b.name));
          console.log('Please create the bucket or check the bucket name.');
          return;
        }
      }
    } catch (error) {
      console.error('Error testing Supabase connection:', error.message);
    }

    // 1. Get all events from the database
    console.log('\n=== Fetching Events ===');
    console.log('Fetching events from database...');
    const { data: events, error: fetchError } = await supabase
      .from('event')
      .select('id, name');

    if (fetchError) {
      console.error('Database fetch error:', fetchError.message);
      console.error('Full error:', fetchError);
      throw new Error(`Error fetching events: ${fetchError.message}`);
    }

    console.log(`Found ${events.length} events in database`);
    events.forEach((event, index) => {
      console.log(`  ${index + 1}. ${event.name} (ID: ${event.id})`);
    });

    // 2. Check if image file exists
    console.log('\n=== Checking Image File ===');
    const imagePath = path.join(__dirname, IMAGE_FILE);
    console.log('Image path:', imagePath);
    console.log('File exists:', fs.existsSync(imagePath));
    
    if (!fs.existsSync(imagePath)) {
      console.error(`❌ Image file '${IMAGE_FILE}' does not exist in the scripts folder.`);
      console.log('Please add an image file named "disco.png" to the scripts folder.');
      process.exit(1);
    }

    // Get file stats
    const fileStats = fs.statSync(imagePath);
    console.log('File size:', fileStats.size, 'bytes');
    console.log(`Using image: ${IMAGE_FILE}`);

    // 3. Read the image file once
    console.log('\n=== Reading Image File ===');
    const fileBuffer = fs.readFileSync(imagePath);
    const fileExtension = path.extname(IMAGE_FILE);
    console.log('File extension:', fileExtension);
    console.log('Content type:', getContentType(fileExtension));
    console.log('Buffer size:', fileBuffer.length, 'bytes');

    // 4. Process each event
    console.log('\n=== Processing Events ===');
    for (const event of events) {
      console.log(`\n--- Processing event: ${event.name} (ID: ${event.id}) ---`);

      const fileName = `${event.id}${fileExtension}`;
      const eventNameSlug = event.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
      const storagePath = `${STORAGE_FOLDER}/${eventNameSlug}/${fileName}`;
      
      console.log('Generated values:', {
        fileName,
        eventNameSlug,
        storagePath,
        fullPath: `${STORAGE_BUCKET}/${storagePath}`
      });

      try {
        // 5. Upload image to Supabase storage
        console.log(`📤 Uploading to storage path: ${storagePath}`);
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(storagePath, fileBuffer, {
            contentType: getContentType(fileExtension),
            upsert: true // Overwrite if file already exists
          });

        if (uploadError) {
          console.error(`❌ Error uploading image for event ${event.name}:`, uploadError.message);
          console.error('Full upload error:', uploadError);
          console.error('Error details:', {
            bucket: STORAGE_BUCKET,
            path: storagePath,
            fileSize: fileBuffer.length,
            contentType: getContentType(fileExtension)
          });
          continue;
        }

        console.log('✅ Upload successful!');
        console.log('Upload data:', uploadData);

        // 6. Get the public URL
        console.log('🔗 Getting public URL...');
        const { data: urlData } = supabase.storage
          .from(STORAGE_BUCKET)
          .getPublicUrl(storagePath);

        const publicUrl = urlData.publicUrl;
        console.log(`Public URL: ${publicUrl}`);

        // 7. Update the event record with the image URL
        console.log('💾 Updating database record...');
        const { error: updateError } = await supabase
          .from('event')
          .update({ image_url: publicUrl })
          .eq('id', event.id);

        if (updateError) {
          console.error(`❌ Error updating event ${event.name}:`, updateError.message);
          console.error('Full update error:', updateError);
        } else {
          console.log(`✅ Successfully updated event ${event.name} with image URL`);
        }

      } catch (error) {
        console.error(`❌ Error processing event ${event.name}:`, error.message);
        console.error('Full error:', error);
      }
    }

    console.log('\n🎉 Event image upload process completed!');

  } catch (error) {
    console.error('❌ Script failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

function getContentType(fileExtension) {
  const contentTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp'
  };
  
  return contentTypes[fileExtension.toLowerCase()] || 'image/jpeg';
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help')) {
    console.log(`
Event Image Upload Script

Usage:
  node upload-event-images.js

Environment Variables Required:
  EXPO_PUBLIC_SUPABASE_URL      Your Supabase project URL
  SUPABASE_SERVICE_ROLE_KEY     Your Supabase service role key (not anon key)

Setup:
1. Set your environment variables
2. Add an image file named "event-image.jpg" to the scripts folder
3. Run the script: npm run upload-event-images

The script will:
- Fetch all events from the database
- Upload the same image to Supabase storage for each event
- Update each event's image_url field with the public URL
    `);
    return;
  }

  await uploadEventImages();
}

main().catch(console.error); 