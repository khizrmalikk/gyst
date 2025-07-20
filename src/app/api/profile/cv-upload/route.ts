import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { parseCV } from '@/lib/services/cv-parser'
import { supabaseAdmin, getUserProfile } from '@/lib/supabase'

// Helper function to convert date strings to PostgreSQL DATE format
function convertToDate(dateString: string): string | null {
  if (!dateString || dateString.toLowerCase() === 'present' || dateString.toLowerCase() === 'current') {
    return null;
  }
  
  try {
    // Handle YYYY-MM format (add -01 for day)
    if (/^\d{4}-\d{2}$/.test(dateString)) {
      return `${dateString}-01`;
    }
    
    // Handle YYYY-MM-DD format (already valid)
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return dateString;
    }
    
    // Handle YYYY format (add -01-01)
    if (/^\d{4}$/.test(dateString)) {
      return `${dateString}-01-01`;
    }
    
    // Try to parse other formats
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
    
    console.warn(`Could not parse date: ${dateString}`);
    return null;
  } catch (error) {
    console.error(`Error parsing date ${dateString}:`, error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Only PDF, DOC, and DOCX files are allowed.' }, { status: 400 })
    }

    // Validate file size (5MB limit)
    const maxSize = 5 * 1024 * 1024 // 5MB in bytes
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File too large. Maximum size is 5MB.' }, { status: 400 })
    }

    // Get user profile
    const profile = await getUserProfile(userId)
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Convert file to buffer
    const buffer = await file.arrayBuffer()
    const bufferData = Buffer.from(buffer)

    // Process CV and extract data
    let extractedData
    try {
      extractedData = await parseCV(bufferData, file.type)
    } catch (parsingError) {
      console.error('CV parsing error:', parsingError)
      const errorMessage = parsingError instanceof Error ? parsingError.message : 'Unknown parsing error'
      return NextResponse.json({ 
        error: 'Failed to parse CV', 
        details: errorMessage 
      }, { status: 400 })
    }

    // Update profile with extracted personal information
    const profileUpdates: Record<string, any> = {}
    
    // Always mark CV as uploaded
    profileUpdates.cv_uploaded = true
    
    // Update personal info if data was extracted
    if (extractedData.fullName) {
      profileUpdates.full_name = extractedData.fullName
    }
    if (extractedData.phone) {
      profileUpdates.phone = extractedData.phone
    }
    if (extractedData.location) {
      profileUpdates.location = extractedData.location
    }
    if (extractedData.skills && extractedData.skills.length > 0) {
      profileUpdates.skills = extractedData.skills
    }

    // Always update the profile to at least mark CV as uploaded
    console.log('Updating profile with:', profileUpdates)
    const updateResult = await supabaseAdmin
      .from('user_profiles')
      .update(profileUpdates)
      .eq('user_id', userId)
      .select()

    if (updateResult.error) {
      console.error('Profile update error:', updateResult.error)
    } else {
      console.log('Profile updated successfully:', updateResult.data)
    }

    // Insert education records
    if (extractedData.education && extractedData.education.length > 0) {
      const educationRecords = extractedData.education
        .filter(edu => edu.school && edu.degree) // Only include records with required fields
        .map(edu => {
          const startDate = convertToDate(edu.startDate);
          const endDate = convertToDate(edu.endDate);
          
          return {
            user_id: profile.id, // Use profile UUID as foreign key
            institution: edu.school,
            degree: edu.degree,
            field_of_study: edu.fieldOfStudy || '',
            start_date: startDate,
            end_date: endDate,
            description: edu.description || '',
            is_current: edu.endDate === 'present' || edu.endDate === 'current'
          };
        })
        .filter(record => record.start_date !== null); // Only include records with valid start dates

      if (educationRecords.length > 0) {
        console.log('Inserting education records:', educationRecords)
        const educationResult = await supabaseAdmin
          .from('education')
          .insert(educationRecords)
        
        if (educationResult.error) {
          console.error('Education insert error:', educationResult.error)
        } else {
          console.log('Education records inserted successfully')
        }
      } else {
        console.log('No valid education records to insert')
      }
    }

    // Insert experience records
    if (extractedData.experience && extractedData.experience.length > 0) {
      const experienceRecords = extractedData.experience
        .filter(exp => exp.company && exp.title) // Only include records with required fields
        .map(exp => {
          const startDate = convertToDate(exp.startDate);
          const endDate = convertToDate(exp.endDate);
          
          return {
            user_id: profile.id, // Use profile UUID as foreign key
            company: exp.company,
            position: exp.title,
            start_date: startDate,
            end_date: endDate,
            is_current: exp.endDate === 'present' || exp.endDate === 'current',
            description: exp.description || ''
          };
        })
        .filter(record => record.start_date !== null); // Only include records with valid start dates

      if (experienceRecords.length > 0) {
        console.log('Inserting experience records:', experienceRecords)
        const experienceResult = await supabaseAdmin
          .from('experience')
          .insert(experienceRecords)
        
        if (experienceResult.error) {
          console.error('Experience insert error:', experienceResult.error)
        } else {
          console.log('Experience records inserted successfully')
        }
      } else {
        console.log('No valid experience records to insert')
      }
    }

    return NextResponse.json({
      message: 'CV uploaded and processed successfully',
      fileName: file.name,
      fileSize: file.size,
      extractedData: {
        personalInfo: {
          fullName: extractedData.fullName,
          phone: extractedData.phone,
          location: extractedData.location,
          skillsCount: extractedData.skills?.length || 0
        },
        education: extractedData.education?.length || 0,
        experience: extractedData.experience?.length || 0
      }
    })

  } catch (error) {
    console.error('Error uploading CV:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { 
        error: 'Failed to upload and process CV',
        details: errorMessage 
      },
      { status: 500 }
    )
  }
} 