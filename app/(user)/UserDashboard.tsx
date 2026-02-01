import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../services/authContext';
import { getProjectsForUser, getProjects } from '../../services/firestoreService';
import { Project } from '../../types';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { Building2, MapPin, ArrowRight } from 'lucide-react';

const UserDashboard: React.FC = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserProjects = async () => {
      if (!user) return;
      setLoading(true);
      try {
        let data: Project[] = [];
        if (user.role === 'admin') {
          // Fallback if admin navigates here (though they should use AdminDashboard)
          data = await getProjects(); 
        } else {
          data = await getProjectsForUser(user.assignedProjects);
        }
        setProjects(data);
      } catch (error) {
        console.error("Error fetching projects", error);
      } finally {
        setLoading(false);
      }
    };
    fetchUserProjects();
  }, [user]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Minhas Obras</h1>
        <p className="text-gray-500">Projetos onde você possui acesso para gerenciar estoque.</p>
      </div>

      {loading ? (
        <div className="text-center py-10">Carregando...</div>
      ) : projects.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
           <Building2 className="mx-auto h-12 w-12 text-gray-300" />
           <p className="mt-2 text-gray-600">Você não possui obras vinculadas.</p>
           <p className="text-sm text-gray-400">Contate o administrador.</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Card key={project.id} className="hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-4">
                 <div className="p-2 bg-gray-100 rounded-lg text-primary">
                    <Building2 size={24} />
                 </div>
                 <div>
                    <h3 className="font-bold text-gray-900">{project.name}</h3>
                    <span className="text-xs text-green-600 font-medium bg-green-50 px-2 py-0.5 rounded-full">
                       {project.status === 'active' ? 'Ativa' : project.status}
                    </span>
                 </div>
              </div>
              
              <div className="text-sm text-gray-500 mb-6 flex items-start">
                 <MapPin size={16} className="mr-2 mt-0.5 shrink-0" />
                 {project.address}
              </div>

              <Button 
                className="w-full"
                onClick={() => navigate(`/user/project/${project.id}/inventory`)}
              >
                Acessar Estoque <ArrowRight size={16} className="ml-2" />
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default UserDashboard;