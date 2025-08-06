// delete-banditsassets.js
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

// Load environment variables from .env file in the same directory
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.join(__dirname, '.env') })

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_KEY

console.log('🔧 Script Configuration:')
console.log('   📁 Script directory:', __dirname)
console.log('   📄 .env file path:', path.join(__dirname, '.env'))
console.log('   🌐 Supabase URL:', SUPABASE_URL)
console.log('   🔑 Supabase Key:', SUPABASE_KEY ? '✅ Present' : '❌ Missing')

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing required environment variables:')
  console.error('   EXPO_PUBLIC_SUPABASE_URL:', SUPABASE_URL ? '✅' : '❌')
  console.error('   SUPABASE_KEY:', SUPABASE_KEY ? '✅' : '❌')
  process.exit(1)
}

const BUCKET = 'banditsassets2'
console.log('   🗂️  Target bucket:', BUCKET)

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function deleteAllFiles() {
  console.log('\n🚀 Starting file deletion process...')
  
  let allFiles = []
  let page = 0
  const pageSize = 1000

  while (true) {
    console.log(`   📄 Listing files (page ${page + 1})...`)
    const { data, error } = await supabase.storage.from(BUCKET).list('', {
      limit: pageSize,
      offset: page * pageSize,
    })

    if (error) {
      console.error('❌ Error listing files:', error)
      return
    }

    if (!data || data.length === 0) {
      console.log(`   ✅ No more files found on page ${page + 1}`)
      break
    }

    console.log(`   📋 Found ${data.length} files on page ${page + 1}`)
    allFiles.push(...data.map(f => f.name))
    page++
  }

  if (allFiles.length === 0) {
    console.log('✅ No files found in bucket.')
    return
  }

  console.log(`\n⚠️  Deleting ${allFiles.length} files from bucket '${BUCKET}'...`)
  console.log('   📝 Files to delete:', allFiles.slice(0, 5).join(', '), allFiles.length > 5 ? `... and ${allFiles.length - 5} more` : '')

  const { error: deleteError } = await supabase.storage.from(BUCKET).remove(allFiles)

  if (deleteError) {
    console.error('❌ Error deleting files:', deleteError)
  } else {
    console.log('✅ All files deleted successfully.')
  }
}

deleteAllFiles()
