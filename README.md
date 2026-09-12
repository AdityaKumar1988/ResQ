<!-- ========================================================= -->
<!--                         RESQ README                        -->
<!-- ========================================================= -->

<div align="center">

# 🚑 ResQ

### Real-Time Emergency Response & Dispatch Platform

<img src="https://readme-typing-svg.demolab.com?font=Fira+Code&size=24&pause=1000&color=00C2FF&center=true&vCenter=true&width=800&lines=Emergency+Response+%7C+Real-Time+Dispatch;Intelligent+Ambulance+Recommendation;Concurrency-Safe+Ambulance+Assignment;Live+GPS+Tracking+with+Socket.IO;Built+with+React+%2B+Node.js+%2B+PostgreSQL" alt="Typing Animation" />

<br/>

<p>
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=white" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Node.js-20-339933?style=for-the-badge&logo=node.js&logoColor=white" />
  <img src="https://img.shields.io/badge/Express.js-Backend-000000?style=for-the-badge&logo=express&logoColor=white" />
</p>

<p>
  <img src="https://img.shields.io/badge/PostgreSQL-Database-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" />
  <img src="https://img.shields.io/badge/Socket.IO-Realtime-010101?style=for-the-badge&logo=socket.io&logoColor=white" />
  <img src="https://img.shields.io/badge/JWT-Authentication-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white" />
  <img src="https://img.shields.io/badge/Zod-Validation-3E67B1?style=for-the-badge" />
</p>

<br/>

**ResQ is a real-time emergency medical dispatch and ambulance fleet coordination platform designed to make emergency response faster, safer, and more coordinated.**

<br/>

<a href="#-overview">Overview</a> •
<a href="#-features">Features</a> •
<a href="#-architecture">Architecture</a> •
<a href="#-workflow">Workflow</a> •
<a href="#-tech-stack">Tech Stack</a> •
<a href="#-installation">Installation</a>

</div>

---

<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:00C2FF,100:0066FF&height=120&section=header&text=RESQ&fontSize=40&fontColor=ffffff&animation=fadeIn&fontAlignY=35" />

</div>

# 🚨 Overview

Emergency medical response is highly time-sensitive.

A few minutes of delay in:

- identifying an available ambulance,
- assigning the correct vehicle,
- communicating with the driver,
- tracking the ambulance,
- or updating the emergency status

can significantly affect the response process.

**ResQ** addresses these coordination challenges by bringing the major participants of an emergency response system into a single platform.

The platform supports four major roles:

| Role | Responsibility |
|---|---|
| 👤 **Citizen** | Report emergencies and track response |
| 🚑 **Driver** | Receive assignments, update status and share GPS |
| 🎧 **Dispatcher** | Monitor incidents and assign ambulances |
| 🛠️ **Admin** | Manage and oversee the platform |

The system combines **REST APIs, PostgreSQL, Socket.IO, JWT authentication, role-based authorization, runtime validation, geospatial calculations, and concurrency control** into one end-to-end emergency dispatch workflow.

---

# 🎯 Problem Statement

Traditional emergency coordination can involve multiple disconnected processes.

A dispatcher may need to:

```text
Find emergency
     ↓
Check available ambulances
     ↓
Find nearest ambulance
     ↓
Contact driver
     ↓
Track ambulance
     ↓
Update emergency status
     ↓
Notify relevant people
