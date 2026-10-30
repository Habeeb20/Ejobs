import { Building2, Award, Briefcase, ScrollText, School, ShieldCheck , FileText, GraduationCap, Landmark, MapPin, Phone, User, Users } from "lucide-react";
import PersonalTab from "./tabs/PersonalTab";
import AddressTab from "./tabs/AddressTab";
import CareerTab from "./tabs/CareerTab";
import DocumentsTab from "./tabs/DocumentsTab";
import NextOfKinTab from "./tabs/NextOfKinTab";
import BankTab from "./tabs/BankTab";
import CompanyTab from "./tabs/CompanyTab";
import ContactTab from "./tabs/ContactTab";
import CvTab from "./tabs/cv/CvTab";
import GuarantorsTab from "./tabs/GuarantorsTab";
import WorkTab from "./tabs/WorkTab"
import CertificatesTab from "./tabs/CertificateTab";
import EducationTab from "./tabs/EducationTab";
export const TABS = {
  personal: { key: "personal", label: "Personal", icon: User, component: PersonalTab },
  address: { key: "address", label: "Address", icon: MapPin, component: AddressTab },
  career: { key: "career", label: "Career", icon: GraduationCap, component: CareerTab },
  documents: { key: "documents", label: "Documents", icon: FileText, component: DocumentsTab },
  nextOfKin: { key: "nextOfKin", label: "Next of kin", icon: Users, component: NextOfKinTab },
  bank: { key: "bank", label: "Bank", icon: Landmark, component: BankTab },
  company: { key: "company", label: "Company", icon: Building2, component: CompanyTab },
  contact: { key: "contact", label: "Contact", icon: Phone, component: ContactTab },
  education: { key: "education", label: "Education", icon: School, component: EducationTab },
work: { key: "work", label: "Work", icon: Briefcase, component: WorkTab },
certificates: { key: "certificates", label: "Certificates", icon: Award, component: CertificatesTab },
guarantors: { key: "guarantors", label: "Guarantors", icon: ShieldCheck, component: GuarantorsTab },
cv: { key: "cv", label: "My CV", icon: ScrollText, component: CvTab },
};

export const TABS_BY_ROLE = {
jobseeker: ["personal", "address", "career", "education", "work", "certificates", "cv", "documents", "guarantors", "nextOfKin", "bank"],
  employer: ["company", "contact", "address", "documents"],
  agent: ["personal", "address", "bank"],
  admin: ["personal", "address"],
  superadmin: ["personal", "address"],
};







