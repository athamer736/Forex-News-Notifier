from alembic import op
import sqlalchemy as sa

def upgrade():
    # Add ai_summary and summary_generated_at columns
    op.add_column('forex_events', sa.Column('ai_summary', sa.Text(), nullable=True))
    op.add_column('forex_events', sa.Column('summary_generated_at', sa.DateTime(timezone=True), nullable=True))

def downgrade():
    # Remove the columns if we need to roll back
    op.drop_column('forex_events', 'summary_generated_at')
    op.drop_column('forex_events', 'ai_summary') 