import React, { useEffect, useState } from "react";
import authService from "../../api/authService";
import { motion } from "framer-motion";
import { Mail, Phone, Clock, Edit, Check } from "lucide-react";

export default function DoctorProfile() {
    const [isEdit, setIsEdit] = useState(false);
    const [loading, setLoading] = useState(true);
    const [editLoading, setEditLoading] = useState(false);
    const [profile, setProfile] = useState(null);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const data = await authService.getProfile();
                const fetchedProfile = {
                    name: data.user?.name || "",
                    email: data.user?.email || "",
                    specialization: data.profile?.specialization || "",
                    phone: data.profile?.phone || "",
                    bio: data.profile?.bio || "",
                    licenseNumber: data.profile?.license_number || "",
                    availability: data.profile?.availability || "",
                };
                setProfile(fetchedProfile);
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

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name.startsWith("avail_")) {
            const [, type, day] = name.split("_");
            setProfile((prev) => {
                const dayTimes = prev.availability?.[day] || ["", ""];
                const newTimes = [...dayTimes];
                if (type === "start") newTimes[0] = value;
                else newTimes[1] = value;
                return {
                    ...prev,
                    availability: {
                        ...prev.availability,
                        [day]: newTimes,
                    },
                };
            });
        } else {
            setProfile({ ...profile, [name]: value });
        }
    };

    const toggleEdit = async () => {
        if (isEdit) {
            setEditLoading(true);
            try {
                await authService.editProfile(profile);
            } catch (error) {
                console.error("Failed to update profile", error);
            } finally {
                setEditLoading(false);
            }
        }
        setIsEdit(!isEdit);
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="max-w-7xl mx-auto px-6 py-10"
        >
            {/* Header */}
            <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="flex items-center justify-between bg-white rounded-2xl shadow p-6 mb-8"
            >
                <div className="flex items-center gap-5">
                    {/* Default Avatar */}
                    <div className="h-20 w-20 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-2xl font-bold text-blue-600">
                            {profile.name.charAt(0)}
                        </span>
                    </div>

                    <div className="flex flex-col">
                        {isEdit ? (
                            <input
                                name="name"
                                value={profile.name}
                                onChange={handleChange}
                                className="text-xl font-bold border px-2 py-1 rounded w-[180px] mb-2"
                            />
                        ) : (
                            <h2 className="text-xl font-bold">
                                {profile.name}
                            </h2>
                        )}

                        {isEdit ? (
                            <input
                                name="specialization"
                                value={profile.specialization}
                                onChange={handleChange}
                                className="text-blue-500 text-sm border px-2 py-1 rounded w-[160px]"
                            />
                        ) : (
                            <span className="text-blue-500 text-sm font-medium">
                                {profile.specialization}
                            </span>
                        )}
                    </div>
                </div>

                <button
                    onClick={toggleEdit}
                    disabled={editLoading}
                    className="flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50"
                >
                    {isEdit ? (
                        editLoading ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white hidden sm:block"></div>
                        ) : (
                            <Check size={15} />
                        )
                    ) : (
                        <Edit size={16} />
                    )}
                    {isEdit ? (editLoading ? "Saving..." : "Save") : "Edit Profile"}
                </button>
            </motion.div>

            {/* Grid */}
            <div className="grid md:grid-cols-2 gap-6">
                {/* Professional Info */}
                <motion.div
                    whileHover={{ y: -5 }}
                    className="bg-white rounded-xl shadow p-6"
                >
                    <h3 className="font-semibold mb-4 text-lg">
                        Professional Information
                    </h3>

                    <EditableField
                        label="Name"
                        name="name"
                        value={profile.name}
                        isEdit={isEdit}
                        handleChange={handleChange}
                    />

                    <EditableField
                        label="Specialization"
                        name="specialization"
                        value={profile.specialization}
                        isEdit={isEdit}
                        handleChange={handleChange}
                    />

                    <EditableField
                        label="License Number"
                        name="licenseNumber"
                        value={profile.licenseNumber}
                        isEdit={isEdit}
                        handleChange={handleChange}
                    />
                </motion.div>

                {/* Availability */}
                <motion.div
                    whileHover={{ y: -5 }}
                    className="bg-white rounded-xl shadow p-6"
                >
                    <h3 className="font-semibold mb-4 text-lg">Availability</h3>

                    {profile.availability && Object.keys(profile.availability).length > 0 ? (
                        Object.entries(profile.availability).map(([day, times]) => (
                            <EditableAvailabilityField
                                key={day}
                                day={day}
                                times={times}
                                isEdit={isEdit}
                                handleChange={handleChange}
                            />
                        ))
                    ) : (
                        <div className="text-sm text-slate-500">No availability set</div>
                    )}
                </motion.div>

                {/* Bio */}
                <motion.div
                    whileHover={{ y: -5 }}
                    className="bg-white rounded-xl shadow p-6"
                >
                    <h3 className="font-semibold mb-4 text-lg">
                        Professional Bio
                    </h3>

                    {isEdit ? (
                        <textarea
                            name="bio"
                            value={profile.bio}
                            onChange={handleChange}
                            className="w-full border rounded p-2"
                        />
                    ) : (
                        <p className="text-slate-600">{profile.bio}</p>
                    )}
                </motion.div>

                {/* Contact */}
                <motion.div
                    whileHover={{ y: -5 }}
                    className="bg-white rounded-xl shadow p-6"
                >
                    <h3 className="font-semibold mb-4 text-lg">
                        Contact Information
                    </h3>

                    <EditableIconField
                        icon={<Mail size={18} />}
                        label="Email"
                        name="email"
                        value={profile.email}
                        isEdit={isEdit}
                        handleChange={handleChange}
                    />

                    <EditableIconField
                        icon={<Phone size={18} />}
                        label="Phone"
                        name="phone"
                        value={profile.phone}
                        isEdit={isEdit}
                        handleChange={handleChange}
                    />
                </motion.div>
            </div>
        </motion.div>
    );
}

/* Reusable Editable Field */
function EditableField({ label, name, value, isEdit, handleChange }) {
    return (
        <div className="flex justify-between text-sm mb-3">
            <span className="text-slate-500">{label}</span>
            {isEdit ? (
                <input
                    name={name}
                    value={value}
                    onChange={handleChange}
                    className="border px-2 py-1 rounded"
                />
            ) : (
                <span className="font-medium">{value}</span>
            )}
        </div>
    );
}

/* Reusable Editable Icon Field */
function EditableIconField({ icon, label, name, value, isEdit, handleChange }) {
    return (
        <div className="flex items-center gap-3 text-sm mb-3">
            <div className="text-blue-500">{icon}</div>
            <div className="flex justify-between w-full">
                <span className="text-slate-500">{label}</span>
                {isEdit ? (
                    <input
                        name={name}
                        value={value}
                        onChange={handleChange}
                        className="border px-2 py-1 rounded"
                    />
                ) : (
                    <span className="font-medium">{value}</span>
                )}
            </div>
        </div>
    );
}

/* Reusable Editable Availability Field */
function EditableAvailabilityField({ day, times, isEdit, handleChange }) {
    const dayName = day.charAt(0).toUpperCase() + day.slice(1);
    return (
        <div className="flex items-center gap-3 text-sm mb-3">
            <div className="text-blue-500">
                <Clock size={18} />
            </div>
            <div className="flex justify-between w-full items-center">
                <span className="text-slate-500 w-24">{dayName}</span>
                {isEdit ? (
                    <div className="flex gap-2 items-center">
                        <input
                            name={`avail_start_${day}`}
                            value={times[0] || ""}
                            onChange={handleChange}
                            className="border px-2 py-1 rounded w-28 text-center text-sm"
                            type="time"
                        />
                        <span>-</span>
                        <input
                            name={`avail_end_${day}`}
                            value={times[1] || ""}
                            onChange={handleChange}
                            className="border px-2 py-1 rounded w-28 text-center text-sm"
                            type="time"
                        />
                    </div>
                ) : (
                    <span className="font-medium">
                        {times[0] && times[1]
                            ? `${times[0]} - ${times[1]}`
                            : "Closed"}
                    </span>
                )}
            </div>
        </div>
    );
}
