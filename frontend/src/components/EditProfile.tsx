import React, { useState, useRef } from "react";
import { Modal, Button, Form, Alert } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrash } from "@fortawesome/free-solid-svg-icons";
import userService, { User } from "../services/user-service";
import { useAuth } from "../context/AuthContext";

const DEFAULT_IMAGE = "/images/default-profile.png";

const EditProfile: React.FC<{ show: boolean; handleClose: () => void; onProfileUpdated: (user: User) => void }> = ({ show, handleClose, onProfileUpdated }) => {
  const { user: loggedInUser, setUser: setLoggedInUser } = useAuth();
  const [firstName, setFirstName] = useState(loggedInUser?.firstName || "");
  const [lastName, setLastName] = useState(loggedInUser?.lastName || "");
  const [password, setPassword] = useState("");
  const [headline, setHeadline] = useState(loggedInUser?.headline || "");
  const [bio, setBio] = useState(loggedInUser?.bio || "");
  const [location, setLocation] = useState(loggedInUser?.location || ""); 
  const [website, setWebsite] = useState(loggedInUser?.website || ""); 
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusType, setStatusType] = useState<"success" | "danger" | null>(null);
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const currentProfilePicture = loggedInUser?.profilePicture || ""; 

  // Handle profile picture change
  const handleProfilePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setProfilePicture(e.target.files[0]);
      if (fileInputRef.current) {
        fileInputRef.current.value = e.target.files[0].name;
      }
    }
  };

  // Handle remove profile picture
  const handleRemoveProfilePicture = () => {
    setProfilePicture(null);
    setLoggedInUser((prev) => prev ? { ...prev, profilePicture: undefined } : null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("firstName", firstName);
    formData.append("lastName", lastName);
    formData.append("headline", headline.trim());
    formData.append("bio", bio.trim());
    formData.append("location", location.trim()); 
    formData.append("website", website.trim());   

    if (password) {
      formData.append("password", password);
    }
    
    if (!fileInputRef.current?.files?.length) {
      if (!currentProfilePicture) formData.append("profilePicture", ""); // Revert to default picture
    } else if (profilePicture !== null) {
      formData.append("profilePicture", profilePicture); // Replace with new picture
    }

    try {
      const updatedUser = await userService.updateUser(loggedInUser!._id!, formData);
      setLoggedInUser(updatedUser);
      onProfileUpdated(updatedUser);      
      setStatusMessage("Profile updated successfully!");
      setStatusType("success");      
      setTimeout(() => {
        setStatusMessage(null);
        handleClose();
        navigate(`/profile/${loggedInUser!._id}`);
      }, 2000);
    } catch (error) {
      setStatusMessage("Failed to update profile.");
      setStatusType("danger");
      console.error("Failed to update profile", error);
    }
  };

  return (
    <Modal show={show} onHide={handleClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>Edit Profile</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>First Name</Form.Label>
            <Form.Control type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Last Name</Form.Label>
            <Form.Control type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Headline</Form.Label>
            <Form.Control type="text" value={headline} onChange={(e) => setHeadline(e.target.value)} />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Bio</Form.Label>
            <Form.Control as="textarea" rows={3} value={bio} onChange={(e) => setBio(e.target.value)} />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Location</Form.Label>
            <Form.Control type="text" value={location} onChange={(e) => setLocation(e.target.value)} />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Website</Form.Label>
            <Form.Control type="text" value={website} onChange={(e) => setWebsite(e.target.value)} />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Password</Form.Label>
            <Form.Control type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </Form.Group>

          {/* Profile Picture */}
          <Form.Group className="mb-3">
            <Form.Label>Profile Picture</Form.Label>
            {(profilePicture || (currentProfilePicture && currentProfilePicture !== DEFAULT_IMAGE)) && (
              <div className="mb-2">
                <div className="position-relative d-inline-block">
                  <img 
                    src={profilePicture ? URL.createObjectURL(profilePicture) : currentProfilePicture} 
                    alt="Profile" 
                    className="img-thumbnail d-block" 
                    style={{ width: 100, height: 100 }} 
                  />
                  <FontAwesomeIcon
                  icon={faTrash}
                  className="text-danger position-absolute"
                  style={{ top: '0px', right: '0px', cursor: "pointer", background: "white", borderRadius: "50%" }}
                  onClick={handleRemoveProfilePicture}
                  />
                </div>
              </div>
            )}            
            <Form.Control type="file" onChange={handleProfilePictureChange} ref={fileInputRef} />
          </Form.Group>

          <Button variant="primary" type="submit">
            Save Changes
          </Button>
        </Form>

        {statusMessage && statusType && (
          <Alert variant={statusType} className="mt-3">
            {statusMessage}
          </Alert>
        )}
      </Modal.Body>
    </Modal>
  );
};

export default EditProfile;