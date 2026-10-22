import { AssessmentWizard } from "@/app/assessment/assessment-wizard";
export default async function NewBusinessAssessmentPage({params}:{params:Promise<{businessId:string}>}){const{businessId}=await params;return <AssessmentWizard businessId={businessId}/>}
