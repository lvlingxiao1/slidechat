import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Button, TextField, CircularProgress, Dialog, Select, MenuItem } from '@material-ui/core';

import { baseURL, serverURL, fullURL, instructorURL } from './config';


/**
 * The profile page for instructors (not for students for now)
 * This page lists all the courses of the instructor and all the slides
 */
export default function MyCourses(props) {
    let [courses, setCourses] = useState([]);
    let newCourseRef = useRef(null);
    console.log(1);

    useEffect(() => {
        fetchCourses();
        console.log("fetch");
    }, []);

    const fetchCourses = async () => {
        try {
            let res = await axios.get(`${serverURL}/api/myCourses`);
            setCourses(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const createCourse = async () => {
        try {
            await axios.post(`${serverURL}/api/createCourse`, {
                course: newCourseRef.current.value,
            })
        } catch (err) {
            console.error(err);
        }
        fetchCourses();
    }

    return (
        <div className="profile">
            <div className="title">My Courses</div>
            {courses.map(course =>
                <Course cid={course.id}
                    role={course.role}
                    key={course.id} />
            )}
            <div className="createCourse-bar">
                <TextField
                    variant='outlined'
                    id={`new-course`}
                    placeholder="Course Name"
                    inputRef={newCourseRef} />
                <Button id="fileSubmit" onClick={createCourse} variant="contained" color="primary">Create Course</Button>
            </div>
        </div>
    );
}

function Course({ cid, role }) {
    const [course, setCourse] = useState(null);
    const [loading, setLoading] = useState(true);
    const [managing, setManaging] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [addInstructorRes, setAddInstructorRes] = useState(null);
    const [openModify, setOpenModify] = useState({ open: false });
    let fileUpload = useRef(null);
    let newUserRef = useRef(null);

    const fetchCourse = async () => {
        try {
            let res = await axios.get(`${serverURL}/api/course?id=${cid}`);
            setCourse(res.data);
            setLoading(false);
        } catch (err) {
            console.error(err);
        }
    }

    useEffect(() => {
        fetchCourse();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const uploadPDF = async () => {
        if (fileUpload.current.files.length !== 1) return;

        let formData = new FormData();
        formData.append("cid", cid);
        formData.append("anonymity", "anyone");
        formData.append("file", fileUpload.current.files[0]);
        try {
            setUploading(true);
            await axios.post(`${serverURL}/api/addSlide/`, formData);
        } catch (err) {
            console.log(err);
        } finally {
            setUploading(false);
            fetchCourse();
        }
    }

    const deleteSlide = async (filename, sid) => {
        if (!window.confirm(`Are you sure to delete "${filename}"?`)) return;
        try {
            await axios.delete(`${serverURL}/api/slide?sid=${sid}`);
        } catch (err) {
            console.log(err);
        } finally {
            fetchCourse();
        }
    }

    const addInstructor = async () => {
        try {
            await axios.post(`${serverURL}/api/addInstructor`, {
                course: cid,
                newUser: newUserRef.current.value,
            });
            setAddInstructorRes(<div className="result-ok">Add instructor "{newUserRef.current.value}" successfully!</div>);
        } catch (err) {
            console.error(err);
            setAddInstructorRes(<div className="result-fail">Add instructor failed!</div>);
        } finally {
            fetchCourse();
        }
    }

    const changeManageStatus = () => {
        setAddInstructorRes(null);
        setManaging(!managing);
    }

    const copyToClipboard = (str) => {
        const el = document.createElement('textarea');
        el.value = str;
        el.setAttribute('readonly', '');
        el.style.visibility = false;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
    }

    const modifySlide = (filename, sid) => {
        setOpenModify({ open: true, filename: filename, sid: sid });
    }

    if (loading) return (<div className="course"><div className="loading"><CircularProgress /></div></div>);

    return (
        <div className="course">
            <div className="title">
                {course.name}
                {role === 'instructor'
                    ? <span className={`manage ${managing ? "managing" : ""}`}
                        onClick={changeManageStatus}>
                        <span className='material-icons icon'>settings</span>
                    </span>
                    : <span>&nbsp;</span>}
            </div>
            <div className="slides">{course.slides.map((slide) => {
                let link = `${fullURL()}/${slide.id}`;
                return (
                    <div key={slide.id} className="slide-item">
                        <a className="slide-link" href={link}>{slide.filename}</a>
                        {managing
                            ? <div className="btns">
                                <Button
                                    className="slide-delete-btn"
                                    variant="outlined"
                                    color="primary"
                                    onClick={e => modifySlide(slide.filename, slide.id)}>Modify</Button>
                                <Button
                                    className="slide-delete-btn"
                                    variant="outlined"
                                    color="secondary"
                                    onClick={e => deleteSlide(slide.filename, slide.id)}>Delete</Button>
                            </div>
                            : <Button
                                variant="outlined"
                                color="primary"
                                onClick={e => copyToClipboard(link)}
                            >Copy link</Button>}
                    </div>
                );
            })}</div>

            {managing
                ? <div className="upload-bar">
                    <input type="file" name="file" ref={fileUpload} />
                    <Button
                        onClick={uploadPDF}
                        disabled={uploading}
                        variant="contained"
                        color="primary">Upload</Button>
                    {uploading ? <CircularProgress /> : null}
                </div>
                : null}

            <div className="instructors"><strong>Instructors: </strong>{course.instructors.join(', ')}</div>
            {managing
                ? <>
                    <div className="addInstructor-bar">
                        <TextField
                            variant='outlined'
                            id={`new-instructor`}
                            placeholder="utorid"
                            inputRef={newUserRef} />
                        <Button id="fileSubmit"
                            variant="contained"
                            color="primary"
                            onClick={e => addInstructor(course.cid)}>Add Instructor</Button>
                    </div>
                    {addInstructorRes}
                </>
                : null}

            {openModify.open
                ? <SlideSetting open={openModify.open}
                    onClose={_ => setOpenModify({ open: false })}
                    sid={openModify.sid} />
                : null}
        </div>
    );
}


function SlideSetting({ sid, open, onClose }) {
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [settings, setSettings] = useState({});
    const resultRef = useRef(null);
    const titleRef = useRef(null);
    const fileReupload = useRef(null);

    useEffect(() => {
        axios.get(`${serverURL}/api/slideInfo?slideID=${sid}`).then(res => {
            setSettings(res.data);
            setLoading(false);
        }).catch(err => {
            console.error(err);
        });
    }, [sid]);

    const changeAnonymity = (e) => {
        axios.post(`${serverURL}/api/setAnonymity`, {
            sid: sid,
            anonymity: e.target.value
        }).then(res => {
            setResult(true, "changes saved");
            setSettings({ ...settings, anonymity: e.target.value });
        }).catch(err => {
            console.log(err);
            setResult(false, "update failed!");
        });
    }

    const changeTitle = (e) => {
        axios.post(`${serverURL}/api/setTitle`, {
            sid: sid,
            title: titleRef.current.value
        }).then(res => {
            setResult(true, "changes saved");
        }).catch(err => {
            console.log(err);
            setResult(false, "update failed!");
        });
    }

    const reuploadFile = async (e) => {
        if (fileReupload.current.files.length !== 1) return;
        let formData = new FormData();
        formData.append("sid", sid);
        formData.append("file", fileReupload.current.files[0]);
        try {
            setUploading(true);
            await axios.post(`${serverURL}/api/uploadNewSlide/`, formData);
            setResult(true, "changes saved");
            setSettings({ ...settings, filename: formData.get("file").name });
        } catch (err) {
            console.log(err);
            setResult(false, "update failed!");
        } finally {
            setUploading(false);
        }
    }

    const setResult = (success, message) => {
        let node = resultRef.current;
        node.innerText = message;
        node.className = `result ${success ? "ok" : "fail"}`;
        setTimeout(() => {
            node.style = "opacity: 0;";
        }, 1000)
        setTimeout(() => {
            node.innerText = "";
            node.style = "";
        }, 1500);
    }

    return (
        <Dialog onClose={onClose} open={open}>
            <div className="setting">
                {loading
                    ? <div style={{ textAlign: 'center' }}><CircularProgress /></div>
                    : <>
                        <div className="title">
                            Setting: {settings.filename}
                            <span ref={resultRef}></span>
                        </div>
                        <div className="row">
                            <span className="label">Anonymity:</span>
                            <Select value={settings.anonymity}
                                onChange={changeAnonymity}>
                                <MenuItem value="anyone">Anyone</MenuItem>
                                <MenuItem value="student">Student</MenuItem>
                                <MenuItem value="nonymous">Non-anonymous</MenuItem>
                            </Select>
                        </div>
                        <div className="row">
                            <span className="label">Add a title:</span>
                            <TextField
                                className="title-input"
                                placeholder="(at most 30 character)"
                                inputProps={{ maxLength: 25 }}
                                defaultValue={settings.title}
                                inputRef={titleRef} />
                            <Button
                                onClick={changeTitle}
                                disabled={false}
                                variant="contained"
                                color="primary">Update</Button>
                        </div>
                        <div className="row">
                            <span className="label">Re-upload PDF file:</span>
                            <input type="file" name="file" ref={fileReupload} />
                            <Button
                                onClick={reuploadFile}
                                disabled={uploading}
                                variant="contained"
                                color="primary">Upload</Button>
                            {uploading ? <CircularProgress size="2rem" /> : null}
                        </div>
                        <div className="row">
                            <span className="label">Reorder questions to match pages:</span>
                            <Button
                                href={`${baseURL}${instructorURL}/reorderQuestions/${sid}`}
                                variant="contained"
                                color="primary">Reorder</Button>
                        </div>
                    </>}
            </div>
        </Dialog>
    );
}