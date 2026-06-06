import React, { useState, useEffect } from "react";
import authService from "../../api/authService";
import { motion } from "framer-motion";
import {
    Mail,
    Edit2,
    User,
    Phone,
    BriefcaseMedical,
    IdCard,
    Pencil,
    Check,
    X,
} from "lucide-react";

function FieldRow({
    label,
    name,
    value,
    onChange,
    type = "text",
    disabled = false,
    isEdit = false,
}) {
    return (
        <div className="flex justify-between items-center py-0.5 gap-4">
            <p className="text-sm font-medium text-slate-500 shrink-0">
                {label}
            </p>
            {isEdit ? (
                <input
                    type={type}
                    name={name}
                    value={value}
                    onChange={onChange}
                    disabled={disabled}
                    className={`text-sm font-semibold text-right w-full max-w-[55%] rounded-lg px-2 py-1 border focus:outline-none transition-colors
                        ${
                            disabled
                                ? "bg-slate-50 border-transparent text-slate-400 cursor-not-allowed"
                                : "bg-blue-50 border-blue-200 text-slate-800 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                        }`}
                />
            ) : (
                <p className="text-sm font-semibold text-slate-800 text-right w-full max-w-[55%] truncate">
                    {value || "—"}
                </p>
            )}
        </div>
    );
}

export default function PatientProfile() {
    const [profile, setProfile] = useState(null);
    const [isEdit, setIsEdit] = useState(false);
    const [draft, setDraft] = useState(null);
    const [loading, setLoading] = useState(true);
    const [editLoading, setEditLoading] = useState(false);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const data = await authService.getProfile();
                const fetchedProfile = {
                    name: data.user?.name || "",
                    email: data.user?.email || "",
                    dob: data.profile?.dob || "",
                    phone: data.profile?.phone || "",
                    address: data.profile?.address || "",
                    emergencyContact: data.profile?.emergency_contact || "",
                    emergencyPhone: data.profile?.emergency_phone || "",
                    bloodGroup: data.profile?.blood_group || "",
                    medicalHistory: data.profile?.medical_history || "",
                    memberSince: data.profile?.created_at
                        ? new Date(data.profile.created_at).toLocaleDateString(
                              "en-US",
                              { month: "long", year: "numeric" },
                          )
                        : "March 2026",
                };
                setProfile(fetchedProfile);
                setDraft(fetchedProfile);
            } catch (error) {
                console.error("Failed to fetch profile", error);
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    function startEdit() {
        setDraft({ ...profile });
        setIsEdit(true);
    }

    function cancelEdit() {
        setDraft({ ...profile });
        setIsEdit(false);
    }

    async function saveEdit() {
        setEditLoading(true);
        try {
            const payload = { ...draft };
            if (!payload.password) {
                delete payload.password;
            }
            await authService.editProfile(payload);
            setProfile({ ...draft });
            setIsEdit(false);
        } catch (error) {
            console.error("Failed to update profile", error);
        } finally {
            setEditLoading(false);
        }
    }

    function handleChange(e) {
        setDraft((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    }

    const dob = profile.dob
        ? new Date(profile.dob).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
          })
        : "—";

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="max-w-7xl mx-auto px-4 py-10"
        >
            {/* header card */}
            <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="bg-white rounded-[2rem] shadow-sm border border-slate-100 px-12 py-8 mb-8 flex flex-col md:flex-row items-center md:items-start justify-between gap-6"
            >
                <div className="flex flex-col md:flex-row items-center gap-6">
                    <div className="relative">
                        <div className="h-[120px] w-[120px] rounded-full overflow-hidden border-2 border-white shadow-md bg-slate-100">
                            <img
                                src="https://t3.ftcdn.net/jpg/08/05/28/22/240_F_805282248_LHUxw7t2pnQ7x8lFEsS2IZgK8IGFXePS.jpg"
                                alt="Profile"
                                className="h-full w-full object-cover"
                            />
                        </div>
                        <motion.button
                            whileHover={{ y: -2 }}
                            whileTap={{ scale: 0.92 }}
                            transition={{ duration: 0.2 }}
                            className="absolute bottom-0 right-0 h-10 w-10 bg-blue-500 border-white border-2 rounded-full flex items-center justify-center cursor-pointer hover:bg-blue-600 transition-colors"
                        >
                            <Pencil size={16} className="text-white" />
                        </motion.button>
                    </div>

                    <div className="flex flex-col items-center md:items-start text-center md:text-left">
                        <h2 className="text-[28px] font-bold text-slate-800 border-b-2 border-blue-400 focus:outline-none bg-transparent mb-1 w-full">
                            {profile.name}
                        </h2>
                        <div className="flex items-center gap-2 text-slate-600 mb-3 mt-1 text-sm font-medium">
                            <Mail size={15} />
                            <span>{profile.email}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="px-3 py-1 bg-pink-50 text-pink-500 text-xs font-semibold rounded-full border border-pink-100">
                                {profile.bloodGroup
                                    ? `${profile.bloodGroup} Blood`
                                    : "Blood Group —"}
                            </span>
                        </div>
                    </div>
                </div>

                {/* actions */}
                {isEdit ? (
                    <div className="flex items-center gap-3 mt-2 md:mt-4">
                        <motion.button
                            onClick={cancelEdit}
                            disabled={editLoading}
                            whileTap={{ scale: 0.92 }}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-red-600 text-red-700 font-semibold text-sm hover:bg-red-50 transition-colors disabled:opacity-50"
                        >
                            <X size={15} /> Cancel
                        </motion.button>
                        <motion.button
                            onClick={saveEdit}
                            disabled={editLoading}
                            whileHover={{ y: -2 }}
                            whileTap={{ scale: 0.92 }}
                            className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-blue-500 text-white font-semibold text-sm hover:bg-blue-600 transition-colors shadow-md shadow-blue-500/20 disabled:opacity-50"
                        >
                            {editLoading ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white hidden sm:block"></div>
                            ) : (
                                <Check size={15} />
                            )}{" "}
                            {editLoading ? "Saving..." : "Save Changes"}
                        </motion.button>
                    </div>
                ) : (
                    <motion.button
                        onClick={startEdit}
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.92 }}
                        transition={{ duration: 0.2 }}
                        className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#3b82f6] text-white font-semibold text-sm hover:bg-blue-600 transition-colors shadow-md shadow-blue-500/20 mt-2 md:mt-4"
                    >
                        <Edit2 size={16} /> Edit Profile
                    </motion.button>
                )}
            </motion.div>

            {/* info grid */}
            <div className="grid md:grid-cols-2 gap-6">
                {/* Personal information */}
                <motion.div
                    whileHover={{ y: -5 }}
                    className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-8"
                >
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-blue-50 text-blue-500 rounded-full">
                            <User size={20} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800">
                            Personal Information
                        </h3>
                    </div>
                    <div className="space-y-3">
                        <FieldRow
                            label="Full Name"
                            name="name"
                            value={isEdit ? draft.name : profile.name}
                            onChange={handleChange}
                            isEdit={isEdit}
                        />
                        <hr className="border-slate-100" />
                        <FieldRow
                            label="Date of Birth"
                            name="dob"
                            value={isEdit ? draft.dob : dob}
                            onChange={handleChange}
                            type="date"
                            isEdit={isEdit}
                        />
                    </div>
                </motion.div>

                {/* Health */}
                <motion.div
                    whileHover={{ y: -5 }}
                    className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-8"
                >
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-blue-50 text-blue-500 rounded-full">
                            <BriefcaseMedical size={20} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800">
                            Health Information
                        </h3>
                    </div>
                    <div className="space-y-3">
                        {isEdit ? (
                            <>
                                <div className="flex justify-between items-center py-0.5 gap-4">
                                    <p className="text-sm font-medium text-slate-500 shrink-0">
                                        Blood Group
                                    </p>
                                    <select
                                        name="bloodGroup"
                                        value={draft.bloodGroup}
                                        onChange={handleChange}
                                        className="text-sm font-semibold text-right w-[100px] rounded-lg px-2 py-1 bg-blue-50 border border-blue-200 focus:outline-none focus:border-blue-400 transition-colors"
                                    >
                                        <option value="A+">A+</option>
                                        <option value="A-">A-</option>
                                        <option value="B+">B+</option>
                                        <option value="B-">B-</option>
                                        <option value="AB+">AB+</option>
                                        <option value="AB-">AB-</option>
                                        <option value="O+">O+</option>
                                        <option value="O-">O-</option>
                                    </select>
                                </div>
                            </>
                        ) : (
                            <FieldRow
                                label="Blood Group"
                                value={profile.bloodGroup}
                                isEdit={false}
                            />
                        )}
                        <hr className="border-slate-100" />
                        <FieldRow
                            label="Medical History"
                            name="medicalHistory"
                            value={
                                isEdit
                                    ? draft.medicalHistory
                                    : profile.medicalHistory
                            }
                            onChange={handleChange}
                            isEdit={isEdit}
                        />
                    </div>
                </motion.div>

                {/* Account */}
                <motion.div
                    whileHover={{ y: -5 }}
                    className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-8"
                >
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-blue-50 text-blue-500 rounded-full">
                            <IdCard size={20} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800">
                            Account Information
                        </h3>
                    </div>
                    <div className="space-y-3">
                        {/*cannot be edited */}
                        <FieldRow
                            label="Email"
                            value={profile.email}
                            isEdit={false}
                        />
                        <hr className="border-slate-100" />
                        <FieldRow
                            label="Member Since"
                            value={profile.memberSince}
                            isEdit={false}
                        />
                        <hr className="border-slate-100" />
                        {/* password logic later */}
                        <FieldRow
                            label={isEdit ? "New Password" : "Password"}
                            name="password"
                            value={isEdit ? (draft.password ?? "") : "••••••••"}
                            onChange={handleChange}
                            type="password"
                            isEdit={isEdit}
                        />
                    </div>
                </motion.div>

                {/* Contact */}
                <motion.div
                    whileHover={{ y: -5 }}
                    className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-8"
                >
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-blue-50 text-blue-500 rounded-full">
                            <Phone size={20} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800">
                            Contact Information
                        </h3>
                    </div>
                    <div className="space-y-3">
                        <FieldRow
                            label="Phone"
                            name="phone"
                            value={isEdit ? draft.phone : profile.phone}
                            onChange={handleChange}
                            isEdit={isEdit}
                        />
                        <hr className="border-slate-100" />
                        <FieldRow
                            label="Address"
                            name="address"
                            value={isEdit ? draft.address : profile.address}
                            onChange={handleChange}
                            isEdit={isEdit}
                        />
                        <hr className="border-slate-100" />
                        <FieldRow
                            label="Emergency Contact"
                            name="emergencyContact"
                            value={
                                isEdit
                                    ? draft.emergencyContact
                                    : profile.emergencyContact
                            }
                            onChange={handleChange}
                            isEdit={isEdit}
                        />
                        <hr className="border-slate-100" />
                        <FieldRow
                            label="Emergency Phone"
                            name="emergencyPhone"
                            value={
                                isEdit
                                    ? draft.emergencyPhone
                                    : profile.emergencyPhone
                            }
                            onChange={handleChange}
                            isEdit={isEdit}
                        />
                    </div>
                </motion.div>
            </div>
        </motion.div>
    );
}