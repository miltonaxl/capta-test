# Makefile para Git Push con claves SSH
# Autor: miltonaxl <miltonandresaxl@gmail.com>

# Variables
PROJECT_DIR = $(shell pwd)
SSH_KEY_NAME = id_key
SSH_KEY_PATH = $(PROJECT_DIR)/$(SSH_KEY_NAME)
SSH_PUB_KEY_PATH = $(PROJECT_DIR)/$(SSH_KEY_NAME).pub

# Colores para output
RED = \033[0;31m
GREEN = \033[0;32m
YELLOW = \033[1;33m
BLUE = \033[0;34m
NC = \033[0m # No Color

.PHONY: help push generate-keys check-keys configure-git

# Target por defecto
all: help

help: ## Mostrar esta ayuda
	@echo "$(BLUE)📋 Makefile para Git Push con claves SSH locales$(NC)"
	@echo ""
	@echo "$(YELLOW)Comandos disponibles:$(NC)"
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  $(YELLOW)%-15s$(NC) %s\n", $$1, $$2}' $(MAKEFILE_LIST)

push: ## Realizar git push usando claves SSH locales del proyecto
	@echo "$(BLUE)🚀 Realizando git push con claves SSH locales...$(NC)"
	@if [ ! -f "$(SSH_KEY_PATH)" ]; then \
		echo "$(RED)❌ Clave SSH no encontrada en el proyecto$(NC)"; \
		echo "$(YELLOW)💡 Las claves deben estar en: $(SSH_KEY_PATH)$(NC)"; \
		echo "$(YELLOW)💡 Ejecuta 'make generate-keys' si necesitas crearlas$(NC)"; \
		exit 1; \
	fi
	@echo "$(YELLOW)🔑 Usando clave SSH: $(SSH_KEY_PATH)$(NC)"
	@eval "$$(ssh-agent -s)" && \
	ssh-add $(SSH_KEY_PATH) && \
	git push
	@echo "$(GREEN)✅ Git push completado con claves locales$(NC)"





generate-keys: ## Generar claves SSH id_key e id_key.pub en el proyecto
	@echo "$(BLUE)🔑 Generando claves SSH en el proyecto...$(NC)"
	@if [ ! -f "$(SSH_KEY_PATH)" ]; then \
		ssh-keygen -t rsa -b 4096 -f $(SSH_KEY_PATH) -N "" -C "miltonandresaxl@gmail.com"; \
		chmod 600 $(SSH_KEY_PATH); \
		chmod 644 $(SSH_PUB_KEY_PATH); \
		echo "$(GREEN)✅ Claves SSH generadas en el proyecto:$(NC)"; \
		echo "  Privada: $(SSH_KEY_PATH)"; \
		echo "  Pública: $(SSH_PUB_KEY_PATH)"; \
	else \
		echo "$(YELLOW)⚠️  Las claves SSH ya existen en el proyecto$(NC)"; \
	fi

check-keys: ## Verificar estado de las claves SSH
	@echo "$(BLUE)🔍 Verificando claves SSH...$(NC)"
	@if [ -f "$(SSH_KEY_PATH)" ]; then \
		echo "$(GREEN)✅ Clave privada encontrada: $(SSH_KEY_PATH)$(NC)"; \
	else \
		echo "$(RED)❌ Clave privada no encontrada: $(SSH_KEY_PATH)$(NC)"; \
		echo "$(YELLOW)💡 Ejecuta 'make generate-keys' para crear las claves$(NC)"; \
	fi
	@if [ -f "$(SSH_PUB_KEY_PATH)" ]; then \
		echo "$(GREEN)✅ Clave pública encontrada: $(SSH_PUB_KEY_PATH)$(NC)"; \
		echo "$(YELLOW)🔑 Clave pública:$(NC)"; \
		cat $(SSH_PUB_KEY_PATH); \
	else \
		echo "$(RED)❌ Clave pública no encontrada: $(SSH_PUB_KEY_PATH)$(NC)"; \
	fi

configure-git: ## Configurar Git con usuario y email
	@echo "$(BLUE)⚙️  Configurando Git...$(NC)"
	@git config --global user.name "miltonaxl"
	@git config --global user.email "miltonandresaxl@gmail.com"
	@echo "$(GREEN)✅ Git configurado:$(NC)"
	@echo "  Usuario: $$(git config --global user.name)"
	@echo "  Email: $$(git config --global user.email)"