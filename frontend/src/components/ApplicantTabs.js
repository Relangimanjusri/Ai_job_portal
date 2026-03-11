import { NavLink } from "react-router-dom";

export default function ApplicantTabs(){

return(

<div className="applicant-tabs">

<NavLink to="/jobseeker/upload">Upload</NavLink>

<NavLink to="/jobseeker/profile">Profile</NavLink>

<NavLink to="/jobseeker/jobs">Jobs</NavLink>

<NavLink to="/jobseeker/analytics">Analytics</NavLink>

</div>

)

}