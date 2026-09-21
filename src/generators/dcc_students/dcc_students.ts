import { startRandomRollPage } from '../../default_main_page';
import { default_build } from './dcc_students_impl';
import { build_grid } from './populate_student_template';

startRandomRollPage({
  generate: default_build,
  outputRenderer: build_grid,
});
