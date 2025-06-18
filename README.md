# Collab App - Real-time Collaborative Task Management

A modern, real-time collaborative task management application built with React, Redux, Node.js, Express, MongoDB, and Socket.IO.

## 🚀 Features

### Core Features
- **Real-time Collaboration**: Live updates using Socket.IO
- **Task Management**: Create, update, delete, and organize tasks with drag-and-drop
- **Board Management**: Multiple boards for different projects with customizable backgrounds
- **List Organization**: Organize tasks in customizable lists with archiving support
- **User Authentication**: Secure JWT-based authentication with profile management

### Advanced Features
- **Member Management**: Invite users to boards with role-based permissions (Owner, Admin, Member, Viewer)
- **Role-based Access Control**: Different permission levels for board operations
- **Board Deletion**: Owners and admins can delete boards with confirmation
- **Member Administration**: Admins can manage member roles and remove members
- **Invitation System**: Send and manage board invitations
- **Private/Public Boards**: Control board visibility and access
- **Archived Lists**: Archive and restore lists as needed
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Real-time Notifications**: Get notified of changes instantly

## 🛠️ Tech Stack

- **Frontend**: React, Redux Toolkit, Socket.IO Client, Tailwind CSS
- **Backend**: Node.js, Express, MongoDB, Mongoose, Socket.IO
- **Authentication**: JWT (JSON Web Tokens)
- **Real-time**: Socket.IO

## 📦 Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd collab-app
```

2. Install dependencies for both client and server:
```bash
npm run install-all
```

3. Set up environment variables:

**Server Environment:**
```bash
cd server
cp .env.example .env
# Edit .env with your MongoDB connection string and JWT secret
```

**Client Environment (optional):**
```bash
cd client
cp .env.example .env
# Edit .env if you need to change the API URL
```

4. Start the development servers:
```bash
npm run dev
```

This will start both the client (React) and server (Node.js) concurrently.

## 🚀 Usage

### Getting Started
1. Open your browser and navigate to `http://localhost:3000`
2. Register a new account or login with existing credentials
3. Create your first board from the dashboard

### Board Management
- **Create Boards**: Click "Create New Board" and customize title, description, background color, and privacy settings
- **Delete Boards**: Board owners and admins can delete boards using the delete button (appears on hover)
- **Board Visibility**: Toggle between private and public boards

### Member Management
- **Invite Members**: Use the "Invite" button to add members with specific roles
- **Manage Members**: Use the "Members" button to view, edit roles, and remove members
- **Role Permissions**:
  - **Owner**: Full control over the board
  - **Admin**: Can manage members, delete boards, and perform all operations except transferring ownership
  - **Member**: Can create and edit tasks and lists
  - **Viewer**: Read-only access

### Task Organization
- **Create Lists**: Add lists to organize your tasks
- **Add Tasks**: Create tasks within lists with detailed descriptions
- **Drag & Drop**: Reorder tasks and lists by dragging
- **Archive Lists**: Archive completed or unused lists

## 📁 Project Structure

```
collab-app/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── store/         # Redux store and slices
│   │   ├── services/      # API services
│   │   └── utils/         # Utility functions
├── server/                # Node.js backend
│   ├── models/           # MongoDB models
│   ├── routes/           # Express routes
│   ├── middleware/       # Custom middleware
│   └── index.js          # Server entry point
└── package.json          # Root package.json
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.