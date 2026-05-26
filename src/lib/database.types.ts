export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type UserRole = "landlord" | "admin";
export type TenantCheckStatus =
  | "pending_upload"
  | "documents_received"
  | "under_review"
  | "report_ready";
export type Recommendation = "approve" | "conditional" | "decline";
export type InsuranceEligibilityStatus =
  | "eligible"
  | "conditionally_eligible"
  | "not_eligible"
  | "pending_more_documents";
export type ProtectionPackageType =
  | "screening-linked-protection"
  | "deposit-protection"
  | "rent-protection"
  | "damage-protection"
  | "legal-support"
  | "full-protection";
export type DepositProtectionQuoteStatus =
  | "draft"
  | "indicative_quote_ready"
  | "needs_more_documents"
  | "not_available";

export type TenantRiskReasoning = {
  documentCompleteness?: number | null;
  debtToIncomeRatio?: number | null;
  employmentResidencyConfidence?: number | null;
  missingDocumentCount: number;
  identityConfidence?: number | null;
  incomeStability?: number | null;
  extractedSignals: string[];
  rentAffordability?: number | null;
  reviewNotes: string[];
};

export type Database = {
  public: {
    Tables: {
      ai_reports: {
        Row: {
          created_at: string;
          generated_by: string;
          id: string;
          missing_documents: string[];
          recommendation: Recommendation;
          reasoning: TenantRiskReasoning;
          red_flags: string[];
          score: number;
          strengths: string[];
          summary: string;
          tenant_check_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          generated_by?: string;
          id?: string;
          missing_documents?: string[];
          recommendation: Recommendation;
          reasoning?: TenantRiskReasoning;
          red_flags?: string[];
          score: number;
          strengths?: string[];
          summary: string;
          tenant_check_id: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["ai_reports"]["Insert"]>;
        Relationships: [];
      };
      deposit_protection_quotes: {
        Row: {
          coverage_amount: number | null;
          created_at: string;
          id: string;
          landlord_id: string;
          proposed_protection_fee: number | null;
          rent_amount: number | null;
          status: DepositProtectionQuoteStatus;
          tenant_check_id: string;
          tenant_id: string | null;
          traditional_deposit_amount: number | null;
        };
        Insert: {
          coverage_amount?: number | null;
          created_at?: string;
          id?: string;
          landlord_id: string;
          proposed_protection_fee?: number | null;
          rent_amount?: number | null;
          status?: DepositProtectionQuoteStatus;
          tenant_check_id: string;
          tenant_id?: string | null;
          traditional_deposit_amount?: number | null;
        };
        Update: Partial<Database["public"]["Tables"]["deposit_protection_quotes"]["Insert"]>;
        Relationships: [];
      };
      insurance_eligibility: {
        Row: {
          created_at: string;
          eligibility_reason: string;
          id: string;
          manual_override_note: string | null;
          missing_requirements: string[];
          recommended_package: string | null;
          review_source: "system" | "admin_override";
          risk_score: number;
          status: InsuranceEligibilityStatus;
          tenant_check_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          eligibility_reason: string;
          id?: string;
          manual_override_note?: string | null;
          missing_requirements?: string[];
          recommended_package?: string | null;
          review_source?: "system" | "admin_override";
          risk_score: number;
          status: InsuranceEligibilityStatus;
          tenant_check_id: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["insurance_eligibility"]["Insert"]>;
        Relationships: [];
      };
      properties: {
        Row: {
          address_line1: string;
          city: string;
          created_at: string;
          id: string;
          landlord_id: string;
          monthly_rent: number | null;
          name: string;
          notes: string | null;
          postal_code: string | null;
          updated_at: string;
        };
        Insert: {
          address_line1: string;
          city: string;
          created_at?: string;
          id?: string;
          landlord_id: string;
          monthly_rent?: number | null;
          name: string;
          notes?: string | null;
          postal_code?: string | null;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["properties"]["Insert"]>;
        Relationships: [];
      };
      protection_packages: {
        Row: {
          coverage_items: string[];
          created_at: string;
          description: string;
          estimated_price: string;
          id: string;
          is_active: boolean;
          name: string;
          type: ProtectionPackageType;
          updated_at: string;
        };
        Insert: {
          coverage_items?: string[];
          created_at?: string;
          description: string;
          estimated_price: string;
          id?: string;
          is_active?: boolean;
          name: string;
          type: ProtectionPackageType;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["protection_packages"]["Insert"]>;
        Relationships: [];
      };
      tenant_checks: {
        Row: {
          created_at: string;
          id: string;
          landlord_id: string;
          property_id: string;
          requested_documents: string[];
          review_completed_at: string | null;
          review_requested_at: string | null;
          secure_upload_url: string | null;
          status: TenantCheckStatus;
          tenant_email: string | null;
          tenant_full_name: string;
          tenant_phone: string | null;
          updated_at: string;
          upload_token_expires_at: string;
          upload_token_hash: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          landlord_id: string;
          property_id: string;
          requested_documents?: string[];
          review_completed_at?: string | null;
          review_requested_at?: string | null;
          secure_upload_url?: string | null;
          status?: TenantCheckStatus;
          tenant_email?: string | null;
          tenant_full_name: string;
          tenant_phone?: string | null;
          updated_at?: string;
          upload_token_expires_at: string;
          upload_token_hash: string;
        };
        Update: Partial<Database["public"]["Tables"]["tenant_checks"]["Insert"]>;
        Relationships: [];
      };
      tenant_check_protection_options: {
        Row: {
          created_at: string;
          eligibility_status: InsuranceEligibilityStatus;
          id: string;
          package_id: string;
          recommendation_reason: string;
          tenant_check_id: string;
        };
        Insert: {
          created_at?: string;
          eligibility_status: InsuranceEligibilityStatus;
          id?: string;
          package_id: string;
          recommendation_reason: string;
          tenant_check_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["tenant_check_protection_options"]["Insert"]>;
        Relationships: [];
      };
      tenant_documents: {
        Row: {
          created_at: string;
          document_type: string;
          extracted_text: string | null;
          file_name: string;
          file_size: number | null;
          id: string;
          mime_type: string | null;
          storage_path: string;
          tenant_check_id: string;
          updated_at: string;
          upload_status: string;
          uploaded_by_email: string | null;
        };
        Insert: {
          created_at?: string;
          document_type: string;
          extracted_text?: string | null;
          file_name: string;
          file_size?: number | null;
          id?: string;
          mime_type?: string | null;
          storage_path: string;
          tenant_check_id: string;
          updated_at?: string;
          upload_status?: string;
          uploaded_by_email?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["tenant_documents"]["Insert"]>;
        Relationships: [];
      };
      tenant_public_profiles: {
        Row: {
          consent_confirmed: boolean;
          created_at: string;
          current_address: string | null;
          email: string | null;
          employer_name: string | null;
          employment_status: string | null;
          full_name: string | null;
          id: string;
          monthly_income: number | null;
          monthly_rent: number | null;
          move_in_date: string | null;
          notes: string | null;
          phone: string | null;
          tenant_check_id: string;
          updated_at: string;
        };
        Insert: {
          consent_confirmed?: boolean;
          created_at?: string;
          current_address?: string | null;
          email?: string | null;
          employer_name?: string | null;
          employment_status?: string | null;
          full_name?: string | null;
          id?: string;
          monthly_income?: number | null;
          monthly_rent?: number | null;
          move_in_date?: string | null;
          notes?: string | null;
          phone?: string | null;
          tenant_check_id: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["tenant_public_profiles"]["Insert"]>;
        Relationships: [];
      };
      users: {
        Row: {
          company_name: string | null;
          created_at: string;
          email: string;
          full_name: string | null;
          id: string;
          role: UserRole;
          updated_at: string;
        };
        Insert: {
          company_name?: string | null;
          created_at?: string;
          email: string;
          full_name?: string | null;
          id: string;
          role?: UserRole;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["users"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      create_tenant_check: {
        Args: {
          p_address_line1: string;
          p_city: string;
          p_monthly_rent: number;
          p_postal_code: string | null;
          p_property_name: string;
          p_requested_documents: string[];
          p_secure_upload_url: string;
          p_tenant_email: string | null;
          p_tenant_full_name: string;
          p_tenant_phone: string | null;
          p_upload_token_expires_at: string;
          p_upload_token_hash: string;
        };
        Returns: string;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
